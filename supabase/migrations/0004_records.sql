-- imports -------------------------------------------------------------------
create table public.imports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_name text not null default '',
  filename text not null,
  format text not null check (format in ('ris', 'csv', 'nbib')),
  raw_storage_path text,
  record_count int not null default 0,
  imported_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger imports_set_updated_at
  before update on public.imports
  for each row execute function public.set_updated_at();

-- records ---------------------------------------------------------------
create table public.records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  import_id uuid references public.imports (id) on delete set null,
  doi text,
  pmid text,
  scopus_eid text,
  raw jsonb not null default '{}'::jsonb,
  title text not null default '',
  authors text not null default '',
  abstract text,
  year int,
  journal text,
  source_db text,
  dedup_group_id uuid,
  is_duplicate boolean not null default false,
  dedup_primary boolean not null default false,
  human_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, human_ref)
);

create index records_project_id_idx on public.records (project_id);
create index records_dedup_group_id_idx on public.records (dedup_group_id);
create index records_doi_idx on public.records (project_id, lower(doi));

create trigger records_set_updated_at
  before update on public.records
  for each row execute function public.set_updated_at();

-- Per-project human-readable reference numbers (REC0001, REC0002, ...) -----
create table public.record_counters (
  project_id uuid primary key references public.projects (id) on delete cascade,
  next_seq int not null default 1
);

create or replace function public.assign_human_ref()
returns trigger
language plpgsql
as $$
declare
  v_seq int;
begin
  if new.human_ref is not null and new.human_ref <> '' then
    return new;
  end if;

  insert into public.record_counters (project_id, next_seq)
  values (new.project_id, 1)
  on conflict (project_id) do nothing;

  update public.record_counters
  set next_seq = next_seq + 1
  where project_id = new.project_id
  returning next_seq - 1 into v_seq;

  new.human_ref := 'REC' || lpad(v_seq::text, 4, '0');
  return new;
end;
$$;

create trigger records_assign_human_ref
  before insert on public.records
  for each row execute function public.assign_human_ref();

-- fulltext_docs -------------------------------------------------------------
create table public.fulltext_docs (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records (id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- RLS -------------------------------------------------------------------
alter table public.imports enable row level security;
alter table public.records enable row level security;
alter table public.record_counters enable row level security;
alter table public.fulltext_docs enable row level security;

create policy "members can view imports" on public.imports for select
  to authenticated using (public.is_project_member(project_id));
create policy "owner/reviewer can manage imports" on public.imports for all
  to authenticated
  using (public.project_role(project_id) in ('owner', 'reviewer'))
  with check (public.project_role(project_id) in ('owner', 'reviewer'));

create policy "members can view records" on public.records for select
  to authenticated using (public.is_project_member(project_id));
create policy "owner/reviewer can manage records" on public.records for all
  to authenticated
  using (public.project_role(project_id) in ('owner', 'reviewer'))
  with check (public.project_role(project_id) in ('owner', 'reviewer'));

-- record_counters is an internal bookkeeping table touched only by the
-- assign_human_ref trigger (which runs with the inserting user's own
-- privileges since it's a plain, not security-definer, function) — members
-- need write access for the trigger to succeed.
create policy "members can view record counters" on public.record_counters for select
  to authenticated using (public.is_project_member(project_id));
create policy "owner/reviewer can update record counters" on public.record_counters for all
  to authenticated
  using (public.project_role(project_id) in ('owner', 'reviewer'))
  with check (public.project_role(project_id) in ('owner', 'reviewer'));

create policy "members can view fulltext docs" on public.fulltext_docs for select
  to authenticated using (
    public.is_project_member((select project_id from public.records r where r.id = record_id))
  );
create policy "owner/reviewer can manage fulltext docs" on public.fulltext_docs for all
  to authenticated
  using (
    public.project_role((select project_id from public.records r where r.id = record_id)) in ('owner', 'reviewer')
  )
  with check (
    public.project_role((select project_id from public.records r where r.id = record_id)) in ('owner', 'reviewer')
  );
