-- ai_screenings ---------------------------------------------------------
-- Imported (or, later, API-generated) AI pre-screen decisions. Hidden from
-- the screening UI while blind_screening is on; revealed only in the
-- conflict-resolution and agreement (kappa) views. That visibility rule is
-- enforced in the application layer, not RLS — every project member can
-- always read this table, since it's the same small team, not the public.
create table public.ai_screenings (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records (id) on delete cascade,
  model_name text not null,
  decision text not null check (decision in ('INCLUDE', 'UNCERTAIN', 'EXCLUDE')),
  rationale text,
  confidence numeric,
  stage text not null check (stage in ('title_abstract', 'full_text')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_screenings_set_updated_at
  before update on public.ai_screenings
  for each row execute function public.set_updated_at();

-- screenings --------------------------------------------------------------
-- One row per (record, reviewer, stage): an independent human decision.
create table public.screenings (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id),
  stage text not null check (stage in ('title_abstract', 'full_text')),
  decision text not null check (decision in ('INCLUDE', 'UNCERTAIN', 'EXCLUDE')),
  reasons text[] not null default '{}',
  notes text not null default '',
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_id, reviewer_id, stage)
);

create index screenings_record_id_idx on public.screenings (record_id);
create index screenings_reviewer_id_idx on public.screenings (reviewer_id);

create trigger screenings_set_updated_at
  before update on public.screenings
  for each row execute function public.set_updated_at();

-- resolutions -------------------------------------------------------------
-- The final call when independent reviewers disagree at a stage. One row per
-- (record, stage); resolving overwrites the previous resolution via upsert
-- from the app rather than accumulating history (the audit trail is the
-- underlying screenings rows, which are never deleted by a resolution).
create table public.resolutions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records (id) on delete cascade,
  stage text not null check (stage in ('title_abstract', 'full_text')),
  resolved_decision text not null check (resolved_decision in ('INCLUDE', 'UNCERTAIN', 'EXCLUDE')),
  resolved_by uuid not null references public.profiles (id),
  rationale text not null default '',
  resolved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_id, stage)
);

create trigger resolutions_set_updated_at
  before update on public.resolutions
  for each row execute function public.set_updated_at();

-- RLS -------------------------------------------------------------------
alter table public.ai_screenings enable row level security;
alter table public.screenings enable row level security;
alter table public.resolutions enable row level security;

create policy "members can view ai screenings" on public.ai_screenings for select
  to authenticated using (
    public.is_project_member((select project_id from public.records r where r.id = record_id))
  );
create policy "owner/reviewer can manage ai screenings" on public.ai_screenings for all
  to authenticated
  using (
    public.project_role((select project_id from public.records r where r.id = record_id)) in ('owner', 'reviewer')
  )
  with check (
    public.project_role((select project_id from public.records r where r.id = record_id)) in ('owner', 'reviewer')
  );

create policy "members can view screenings" on public.screenings for select
  to authenticated using (
    public.is_project_member((select project_id from public.records r where r.id = record_id))
  );
-- A reviewer may only write their own screening decisions; the owner can
-- also write (e.g. participating as a reviewer, or fixing a data-entry
-- mistake) but not on someone else's behalf via the UI. Deleting a wrong
-- decision the reviewer already saved is still self-service.
create policy "reviewer can manage their own screenings" on public.screenings for all
  to authenticated
  using (
    reviewer_id = auth.uid()
    and public.project_role((select project_id from public.records r where r.id = record_id)) in ('owner', 'reviewer')
  )
  with check (
    reviewer_id = auth.uid()
    and public.project_role((select project_id from public.records r where r.id = record_id)) in ('owner', 'reviewer')
  );
create policy "owner can manage any screening" on public.screenings for all
  to authenticated
  using (public.project_role((select project_id from public.records r where r.id = record_id)) = 'owner')
  with check (public.project_role((select project_id from public.records r where r.id = record_id)) = 'owner');

create policy "members can view resolutions" on public.resolutions for select
  to authenticated using (
    public.is_project_member((select project_id from public.records r where r.id = record_id))
  );
-- Resolving conflicts is an owner responsibility (spec §7: "a resolver
-- (owner/assigned)"); keeping this to the owner role avoids ambiguity about
-- who has final authority over a disputed decision.
create policy "owner can manage resolutions" on public.resolutions for all
  to authenticated
  using (public.project_role((select project_id from public.records r where r.id = record_id)) = 'owner')
  with check (public.project_role((select project_id from public.records r where r.id = record_id)) = 'owner');
