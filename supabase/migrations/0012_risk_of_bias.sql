-- Risk of bias assessment (PROBAST, first instrument) -----------------------
-- One row per (record, assessor, tool, domain). PROBAST has 4 domains
-- (participants, predictors, outcome, analysis) each judged for risk of
-- bias, plus applicability concern for every domain except analysis; we
-- also store one 'overall' row per assessor with the two summary
-- judgments. The signalling questions themselves (text, options) are NOT
-- modeled here — they're a static, versionable config in
-- src/domain/riskOfBias/probast.ts, same way PICOTS/criteria UI copy lives
-- in the frontend rather than a generic "instrument definition" schema we
-- don't need until a second tool (RoB 2, ROBINS-I, ...) actually shows up.
create table public.risk_of_bias_assessments (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records (id) on delete cascade,
  assessor_id uuid not null references public.profiles (id),
  tool text not null default 'probast' check (tool in ('probast')),
  domain text not null check (domain in ('participants', 'predictors', 'outcome', 'analysis', 'overall')),
  answers jsonb not null default '{}',
  risk_judgment text check (risk_judgment in ('low', 'high', 'unclear')),
  applicability_judgment text check (applicability_judgment in ('low', 'high', 'unclear')),
  justification text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_id, assessor_id, tool, domain)
);

create trigger risk_of_bias_assessments_set_updated_at
  before update on public.risk_of_bias_assessments
  for each row execute function public.set_updated_at();

alter table public.risk_of_bias_assessments enable row level security;

-- Same visibility rule as screenings/ai_screenings/resolutions: membership
-- is on the owning project, reached through records.project_id.
create policy "members can view rob assessments"
  on public.risk_of_bias_assessments for select
  to authenticated
  using (public.is_project_member((select project_id from public.records where id = record_id)));

-- Same write rule as screenings: an assessor manages their own rows; the
-- project owner can manage anyone's (e.g. to fix a mistake, or consolidate
-- after a discussion) — no separate "reviewer can edit others" case, unlike
-- screenings there's no reviewers_required_per_record gate here since RoB
-- has no consensus/finalization logic in this first pass.
create policy "assessor manages own rob assessments"
  on public.risk_of_bias_assessments for all
  to authenticated
  using (
    assessor_id = auth.uid()
    or public.project_role((select project_id from public.records where id = record_id)) = 'owner'
  )
  with check (
    assessor_id = auth.uid()
    or public.project_role((select project_id from public.records where id = record_id)) = 'owner'
  );

-- Schema evolution: existing rows predate the risk_of_bias_enabled setting.
-- Backfill so it's always a real boolean (not undefined) for every project
-- — GeneralTab renders it as a controlled checkbox, and `checked={undefined}`
-- would make React log an uncontrolled-to-controlled warning.
update public.projects
set settings = settings || '{"risk_of_bias_enabled": false}'::jsonb
where not (settings ? 'risk_of_bias_enabled');

-- New projects should get the flag explicitly too.
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
    'risk_of_bias_enabled', false
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
