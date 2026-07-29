-- Structured data extraction -------------------------------------------------
-- Post-inclusion step: extract structured fields (population, sample size,
-- outcomes, ...) from every included study. Fields are configurable per
-- project (like criteria/exclusion_reasons), not a fixed form, since this
-- needs to work for any review topic. Extraction follows the same
-- independent-then-reconcile model as screening, but at field granularity —
-- two extractors can agree on 9 fields and disagree on 1 without redoing
-- the whole form, which is the actual Cochrane convention.

create table public.extraction_fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'single_choice', 'multi_choice')),
  options text[] not null default '{}',
  required boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, key)
);

create trigger extraction_fields_set_updated_at
  before update on public.extraction_fields
  for each row execute function public.set_updated_at();

-- One row per (record, extractor): all of that extractor's field answers
-- together, same shape as risk_of_bias_assessments.answers.
create table public.data_extractions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records (id) on delete cascade,
  extractor_id uuid not null references public.profiles (id),
  answers jsonb not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_id, extractor_id)
);

create index data_extractions_record_id_idx on public.data_extractions (record_id);

create trigger data_extractions_set_updated_at
  before update on public.data_extractions
  for each row execute function public.set_updated_at();

-- The final call when extractors disagree on one field. One row per
-- (record, field) — same "upsert overwrites, underlying rows are the audit
-- trail" convention as public.resolutions.
create table public.extraction_resolutions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records (id) on delete cascade,
  field_key text not null,
  resolved_value jsonb not null,
  resolved_by uuid not null references public.profiles (id),
  rationale text not null default '',
  resolved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_id, field_key)
);

create trigger extraction_resolutions_set_updated_at
  before update on public.extraction_resolutions
  for each row execute function public.set_updated_at();

alter table public.extraction_fields enable row level security;
alter table public.data_extractions enable row level security;
alter table public.extraction_resolutions enable row level security;

-- extraction_fields: same policy shape as criteria.
create policy "members can view extraction fields" on public.extraction_fields for select
  to authenticated using (public.is_project_member(project_id));
create policy "owner/reviewer can manage extraction fields" on public.extraction_fields for all
  to authenticated
  using (public.project_role(project_id) in ('owner', 'reviewer'))
  with check (public.project_role(project_id) in ('owner', 'reviewer'));

-- data_extractions: same policy shape as risk_of_bias_assessments (an
-- extractor manages their own row; the owner can manage anyone's).
create policy "members can view data extractions" on public.data_extractions for select
  to authenticated using (
    public.is_project_member((select project_id from public.records where id = record_id))
  );
create policy "extractor manages own data extractions" on public.data_extractions for all
  to authenticated
  using (
    extractor_id = auth.uid()
    or public.project_role((select project_id from public.records where id = record_id)) = 'owner'
  )
  with check (
    extractor_id = auth.uid()
    or public.project_role((select project_id from public.records where id = record_id)) = 'owner'
  );

-- extraction_resolutions: same policy shape as resolutions (owner/reviewer
-- can resolve).
create policy "members can view extraction resolutions" on public.extraction_resolutions for select
  to authenticated using (
    public.is_project_member((select project_id from public.records where id = record_id))
  );
create policy "owner/reviewer can manage extraction resolutions" on public.extraction_resolutions for all
  to authenticated
  using (
    public.project_role((select project_id from public.records where id = record_id)) in ('owner', 'reviewer')
  )
  with check (
    public.project_role((select project_id from public.records where id = record_id)) in ('owner', 'reviewer')
  );

-- v_extraction_field_status ---------------------------------------------
-- Unnests each extractor's `answers` jsonb field-by-field (jsonb_each, not
-- jsonb_each_text, so multi_choice arrays compare by structural equality
-- rather than string equality) and compares across extractors per
-- (record, field). No reviewers_required_per_record-style threshold here —
-- extraction is modeled as "however many independent extractions exist,
-- unanimous agreement finalizes automatically, disagreement needs an
-- explicit resolution."
create view public.v_extraction_field_status with (security_invoker = true) as
with unnested as (
  select
    de.record_id,
    r.project_id,
    de.extractor_id,
    kv.key as field_key,
    kv.value,
    de.updated_at
  from public.data_extractions de
  join public.records r on r.id = de.record_id
  cross join lateral jsonb_each(de.answers) as kv(key, value)
),
agg as (
  select
    record_id,
    project_id,
    field_key,
    count(*) as extractors_count,
    count(distinct value) as distinct_value_count,
    (array_agg(value order by updated_at))[1] as first_value
  from unnested
  group by record_id, project_id, field_key
)
select
  a.record_id,
  a.project_id,
  a.field_key,
  a.extractors_count,
  a.distinct_value_count,
  a.first_value,
  res.resolved_value,
  coalesce(res.resolved_value, case when a.distinct_value_count = 1 then a.first_value end) as final_value,
  (a.distinct_value_count > 1 and res.resolved_value is null) as is_conflict
from agg a
left join public.extraction_resolutions res
  on res.record_id = a.record_id and res.field_key = a.field_key;

-- New project setting, same backfill pattern as risk_of_bias_enabled.
update public.projects
set settings = settings || '{"data_extraction_enabled": false}'::jsonb
where not (settings ? 'data_extraction_enabled');

create or replace function public.create_project(
  p_name text,
  p_description text default '',
  p_prospero_id text default null,
  p_reviewers_required_per_record int default 2,
  p_stages_enabled text[] default array['title_abstract', 'full_text']
)
returns public.projects
language plpgsql
as $$
declare
  v_project public.projects;
  v_settings jsonb;
begin
  v_settings := jsonb_build_object(
    'reviewers_required_per_record', p_reviewers_required_per_record,
    'blind_screening', true,
    'auto_advance_on_decision', true,
    'stages_enabled', to_jsonb(p_stages_enabled),
    'dedup', jsonb_build_object(
      'on_doi', true,
      'on_normalized_title', true,
      'title_similarity_threshold', 0.92
    ),
    'ui_locale', 'pt-BR',
    'ai_screening_enabled', false,
    'ai_counts_as_reviewer', false,
    'risk_of_bias_enabled', false,
    'data_extraction_enabled', false
  );

  insert into public.projects (name, description, owner_id, prospero_id, created_by, settings)
  values (p_name, p_description, auth.uid(), nullif(p_prospero_id, ''), auth.uid(), v_settings)
  returning * into v_project;

  insert into public.project_members (project_id, user_id, role)
  values (v_project.id, auth.uid(), 'owner');

  insert into public.exclusion_reasons (project_id, code, label, order_index)
  values
    (v_project.id, 'wrong_outcome', 'Desfecho errado', 1),
    (v_project.id, 'wrong_population', 'População errada', 2),
    (v_project.id, 'wrong_study_design', 'Desenho de estudo errado', 3),
    (v_project.id, 'wrong_intervention', 'Intervenção errada', 4),
    (v_project.id, 'fulltext_unavailable', 'Texto completo indisponível', 5),
    (v_project.id, 'retracted_article', 'Artigo retratado', 6);

  return v_project;
end;
$$;
