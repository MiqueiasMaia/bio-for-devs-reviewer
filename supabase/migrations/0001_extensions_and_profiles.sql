-- Extensions ----------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()
create extension if not exists citext; -- case-insensitive email matching

-- profiles --------------------------------------------------------------
-- Mirrors auth.users. One row per user, created automatically by the
-- handle_new_user trigger below so the rest of the schema can reference a
-- table in the `public` schema (auth.users cannot be referenced by FKs from
-- RLS-visible tables in the way we need for project_members etc.).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null unique,
  display_name text not null default '',
  initials text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles hold a display name, initials and email — no other sensitive
-- data — and teammates need to see/search each other throughout the app
-- (screening attribution, conflict resolution, inviting a member by email),
-- so read access is open to any authenticated user rather than scoped per
-- project. This is an intentional trade-off for a small, trusted-team tool,
-- not a public multi-tenant product.
create policy "profiles are readable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- project_invites is created in 0002_projects.sql; handle_new_user references
-- it, so the function body is created there instead. Here we just create the
-- trigger scaffold function for the profile row itself.
create or replace function public.derive_initials(p_name text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      upper(
        substring(split_part(trim(p_name), ' ', 1) from 1 for 1) ||
        substring(split_part(trim(p_name), ' ', array_length(regexp_split_to_array(trim(p_name), '\s+'), 1)) from 1 for 1)
      ),
      ''
    ),
    '?'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
