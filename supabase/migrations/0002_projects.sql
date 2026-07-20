-- projects ----------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  owner_id uuid not null references public.profiles (id),
  prospero_id text,
  -- See README / project settings tab for the full shape. Defaults mirror
  -- the shape documented in the spec (§3 project.settings).
  settings jsonb not null default '{
    "reviewers_required_per_record": 2,
    "blind_screening": true,
    "auto_advance_on_decision": true,
    "stages_enabled": ["title_abstract", "full_text"],
    "dedup": { "on_doi": true, "on_normalized_title": true, "title_similarity_threshold": 0.92 },
    "ui_locale": "pt-BR",
    "ai_screening_enabled": false
  }'::jsonb,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- project_members -----------------------------------------------------------
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'reviewer', 'viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- project_invites -------------------------------------------------------
-- A membership offer keyed by email for someone who may not have an account
-- yet. handle_new_user() (0006_auth_trigger.sql) converts matching invites
-- into project_members rows the moment the invitee signs up.
create table public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email citext not null,
  role text not null check (role in ('owner', 'reviewer', 'viewer')),
  invited_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

-- Helper functions used throughout RLS policies ------------------------------
-- security definer + fixed search_path: these read project_members on behalf
-- of the caller regardless of the caller's own RLS grants on that table,
-- which is what lets policies on OTHER tables consult membership without a
-- circular RLS dependency on project_members itself.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
  );
$$;

create or replace function public.project_role(p_project_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.project_members pm
  where pm.project_id = p_project_id and pm.user_id = auth.uid();
$$;

grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.project_role(uuid) to authenticated;

-- RLS: projects ---------------------------------------------------------
alter table public.projects enable row level security;

create policy "members can view their projects"
  on public.projects for select
  to authenticated
  using (public.is_project_member(id));

create policy "any authenticated user can create a project"
  on public.projects for insert
  to authenticated
  with check (owner_id = auth.uid() and created_by = auth.uid());

create policy "owner can update project"
  on public.projects for update
  to authenticated
  using (public.project_role(id) = 'owner')
  with check (public.project_role(id) = 'owner');

create policy "owner can delete project"
  on public.projects for delete
  to authenticated
  using (public.project_role(id) = 'owner');

-- RLS: project_members ----------------------------------------------------
alter table public.project_members enable row level security;

create policy "members can view project membership"
  on public.project_members for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "owner can manage membership"
  on public.project_members for all
  to authenticated
  using (public.project_role(project_id) = 'owner')
  with check (public.project_role(project_id) = 'owner');

-- The project creator needs to become its first member (owner) in the same
-- transaction as project creation; the "owner can manage membership" policy
-- above can't grant that yet (project_role() is still null until this row
-- exists). This narrow policy lets any authenticated user insert exactly one
-- membership row for themselves with role 'owner' on a project they own.
create policy "creator can seed their own owner membership"
  on public.project_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- RLS: project_invites ----------------------------------------------------
alter table public.project_invites enable row level security;

create policy "owner can manage invites"
  on public.project_invites for all
  to authenticated
  using (public.project_role(project_id) = 'owner')
  with check (public.project_role(project_id) = 'owner');
