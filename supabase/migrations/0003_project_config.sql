-- All three tables below are project-scoped configuration, editable in the
-- Project Settings UI. Nothing here is hardcoded to any particular review
-- topic — rows are seeded per-project (see supabase/seed.sql for the one
-- demo project).

-- criteria ----------------------------------------------------------------
create table public.criteria (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('inclusion', 'exclusion')),
  text text not null,
  order_index int not null default 0,
  picots_dimension text check (picots_dimension in ('P', 'I', 'C', 'O', 'T', 'S')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger criteria_set_updated_at
  before update on public.criteria
  for each row execute function public.set_updated_at();

-- highlight_terms -----------------------------------------------------------
-- `category` is free text (not an enum) so projects can define categories
-- beyond the PICOTS defaults (population/intervention/comparator/outcome/
-- timing/study_design/exclusion) if their review needs it.
create table public.highlight_terms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  category text not null,
  terms text[] not null default '{}',
  color text not null default '#94a3b8',
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger highlight_terms_set_updated_at
  before update on public.highlight_terms
  for each row execute function public.set_updated_at();

-- exclusion_reasons -----------------------------------------------------
-- Defaults to the Rayyan-style taxonomy at seed time (see seed.sql / the
-- project-creation wizard), but is fully editable per project.
create table public.exclusion_reasons (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  code text not null,
  label text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create trigger exclusion_reasons_set_updated_at
  before update on public.exclusion_reasons
  for each row execute function public.set_updated_at();

-- RLS -----------------------------------------------------------------------
-- Read: any project member. Write: owner or reviewer (viewers are read-only
-- throughout the app). This mirrors the collaborative nature of PICOTS/
-- criteria definition among the review team.
alter table public.criteria enable row level security;
alter table public.highlight_terms enable row level security;
alter table public.exclusion_reasons enable row level security;

create policy "members can view criteria" on public.criteria for select
  to authenticated using (public.is_project_member(project_id));
create policy "owner/reviewer can manage criteria" on public.criteria for all
  to authenticated
  using (public.project_role(project_id) in ('owner', 'reviewer'))
  with check (public.project_role(project_id) in ('owner', 'reviewer'));

create policy "members can view highlight terms" on public.highlight_terms for select
  to authenticated using (public.is_project_member(project_id));
create policy "owner/reviewer can manage highlight terms" on public.highlight_terms for all
  to authenticated
  using (public.project_role(project_id) in ('owner', 'reviewer'))
  with check (public.project_role(project_id) in ('owner', 'reviewer'));

create policy "members can view exclusion reasons" on public.exclusion_reasons for select
  to authenticated using (public.is_project_member(project_id));
create policy "owner/reviewer can manage exclusion reasons" on public.exclusion_reasons for all
  to authenticated
  using (public.project_role(project_id) in ('owner', 'reviewer'))
  with check (public.project_role(project_id) in ('owner', 'reviewer'));
