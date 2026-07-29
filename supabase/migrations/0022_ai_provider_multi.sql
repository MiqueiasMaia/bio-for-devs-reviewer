-- Multiple saved AI providers per project ----------------------------------
-- Previously project_ai_providers had project_id as the primary key (one
-- provider config per project — switching providers meant overwriting the
-- key). Reviewers want to keep more than one provider's key saved (e.g. to
-- switch away from one that hit a billing/rate-limit issue without having
-- to re-paste a key), so this makes it one row per (project, provider),
-- with an is_active flag marking which one api/ai-screen.ts actually uses.

alter table public.project_ai_providers add column id uuid not null default gen_random_uuid();
alter table public.project_ai_providers drop constraint project_ai_providers_pkey;
alter table public.project_ai_providers add constraint project_ai_providers_pkey primary key (id);
alter table public.project_ai_providers
  add constraint project_ai_providers_project_id_provider_key unique (project_id, provider);

-- Existing rows (one per project today) become that project's active
-- provider by default — correct, since there was only ever one anyway.
alter table public.project_ai_providers add column is_active boolean not null default true;

-- At most one active provider per project.
create unique index project_ai_providers_one_active_per_project
  on public.project_ai_providers (project_id) where is_active;

-- set_project_ai_key: now upserts by (project_id, provider) instead of
-- project_id alone, and always activates the provider it just saved a key
-- for (deactivating any other active row first — order matters here, so
-- the partial unique index above is never violated mid-transaction).
create or replace function public.set_project_ai_key(
  p_project_id uuid,
  p_provider text,
  p_model text,
  p_api_key text,
  p_secret text
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.project_ai_providers
  set is_active = false
  where project_id = p_project_id and provider <> p_provider and is_active;

  insert into public.project_ai_providers (project_id, provider, model, api_key_encrypted, is_active)
  values (p_project_id, p_provider, p_model, pgp_sym_encrypt(p_api_key, p_secret), true)
  on conflict (project_id, provider) do update
    set model = excluded.model,
        api_key_encrypted = excluded.api_key_encrypted,
        is_active = true,
        updated_at = now();
end;
$$;

-- set_project_ai_model: change a specific (already-configured) provider's
-- model without touching its key or its active/inactive status.
create or replace function public.set_project_ai_model(
  p_project_id uuid,
  p_provider text,
  p_model text
) returns void
language sql
security definer
set search_path = public
as $$
  update public.project_ai_providers
  set model = p_model, updated_at = now()
  where project_id = p_project_id and provider = p_provider;
$$;

-- New: switch the active provider without touching any saved key — the
-- actual feature requested ("ficar trocando de provedor" without
-- re-entering keys each time).
create or replace function public.set_active_ai_provider(
  p_project_id uuid,
  p_provider text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_ai_providers
  set is_active = false
  where project_id = p_project_id and provider <> p_provider and is_active;

  update public.project_ai_providers
  set is_active = true, updated_at = now()
  where project_id = p_project_id and provider = p_provider;
end;
$$;

-- get_project_ai_key: now scoped to whichever provider is active for the
-- project (there can be several configured, only one active).
create or replace function public.get_project_ai_key(
  p_project_id uuid,
  p_secret text
) returns table (provider text, model text, api_key text)
language sql
security definer
set search_path = public, extensions
as $$
  select provider, model, pgp_sym_decrypt(api_key_encrypted, p_secret)
  from public.project_ai_providers
  where project_id = p_project_id and is_active;
$$;

-- delete_project_ai_key: now removes one specific provider's config, not
-- the whole project's AI setup.
create or replace function public.delete_project_ai_key(p_project_id uuid, p_provider text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.project_ai_providers where project_id = p_project_id and provider = p_provider;
$$;

-- v_project_ai_config: now one row per configured provider (was
-- maybeSingle before) — the UI lists every provider the project has ever
-- saved a key for, with is_active marking the one actually in use.
-- `create or replace view` can't reorder existing columns, only append —
-- is_active goes after updated_at (not next to has_key) to keep this
-- compatible with the original v_project_ai_config definition.
create or replace view public.v_project_ai_config with (security_invoker = true) as
select project_id, provider, model, true as has_key, updated_at, is_active
from public.project_ai_providers;
