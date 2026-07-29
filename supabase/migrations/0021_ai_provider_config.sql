-- Multi-provider AI configuration per project + usage/cost tracking, and
-- persisting what api/ai-screen.ts already gets back from the model but
-- used to discard (the per-criterion breakdown) — the data foundation for
-- the AI audit/transparency dashboard.

create extension if not exists pgcrypto;

-- project_ai_providers ------------------------------------------------------
-- One row per project: which provider/model it uses, and its own API key,
-- encrypted at rest with pgp_sym_encrypt. The symmetric secret
-- (AI_KEY_ENCRYPTION_SECRET) lives only in the server's environment and is
-- passed as a parameter to the SQL functions below at call time — it's
-- never stored in a column, a Postgres config setting, or a log.
create table public.project_ai_providers (
  project_id uuid primary key references public.projects (id) on delete cascade,
  provider text not null check (provider in ('google', 'groq', 'openrouter', 'anthropic')),
  model text not null,
  api_key_encrypted bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger project_ai_providers_set_updated_at
  before update on public.project_ai_providers
  for each row execute function public.set_updated_at();

alter table public.project_ai_providers enable row level security;

-- Deliberately stricter than the usual is_project_member/project_role in
-- (owner, reviewer) pattern used elsewhere — only the owner can even see
-- that a key exists. No insert/update/delete policy for `authenticated` at
-- all: writing requires encrypting with the server secret, so it only
-- happens via the service role inside api/project-ai-config.ts.
create policy "owner can view own ai provider config"
  on public.project_ai_providers for select
  to authenticated using (public.project_role(project_id) = 'owner');

-- SQL functions: the only place pgp_sym_encrypt/decrypt happen. Called via
-- admin.rpc(...) (service role) from api/project-ai-config.ts and
-- api/ai-screen.ts — never granted to `authenticated`, so the plaintext
-- key never round-trips through a client-reachable query.
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
  insert into public.project_ai_providers (project_id, provider, model, api_key_encrypted)
  values (p_project_id, p_provider, p_model, pgp_sym_encrypt(p_api_key, p_secret))
  on conflict (project_id) do update
    set provider = excluded.provider,
        model = excluded.model,
        api_key_encrypted = excluded.api_key_encrypted,
        updated_at = now();
end;
$$;

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
  set provider = p_provider, model = p_model, updated_at = now()
  where project_id = p_project_id;
$$;

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
  where project_id = p_project_id;
$$;

create or replace function public.delete_project_ai_key(p_project_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.project_ai_providers where project_id = p_project_id;
$$;

-- Safe status view for the frontend: provider/model/whether a key exists,
-- never the ciphertext. Governed by the same owner-only SELECT policy via
-- security_invoker.
create view public.v_project_ai_config with (security_invoker = true) as
select project_id, provider, model, true as has_key, updated_at
from public.project_ai_providers;

-- ai_pricing ------------------------------------------------------------
-- Global reference table (not project-scoped) — editable directly in the
-- database; no admin UI for it in this version.
create table public.ai_pricing (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google', 'groq', 'openrouter', 'anthropic')),
  model text not null,
  input_price_per_million_tokens numeric not null,
  output_price_per_million_tokens numeric not null,
  currency text not null default 'USD',
  updated_at timestamptz not null default now(),
  unique (provider, model)
);

create trigger ai_pricing_set_updated_at
  before update on public.ai_pricing
  for each row execute function public.set_updated_at();

alter table public.ai_pricing enable row level security;
create policy "anyone authenticated can view pricing" on public.ai_pricing
  for select to authenticated using (true);

-- Seed prices — approximate, published-rate based; update directly in the
-- table as providers change pricing.
insert into public.ai_pricing (provider, model, input_price_per_million_tokens, output_price_per_million_tokens) values
  ('google', 'gemini-2.5-flash', 0.30, 2.50),
  ('google', 'gemini-2.0-flash', 0.10, 0.40),
  ('groq', 'llama-3.3-70b-versatile', 0.59, 0.79),
  ('groq', 'llama-3.1-8b-instant', 0.05, 0.08),
  ('groq', 'gemma2-9b-it', 0.20, 0.20),
  ('anthropic', 'claude-opus-4-8', 15.00, 75.00)
on conflict (provider, model) do nothing;

-- ai_usage_log ------------------------------------------------------------
-- One row per AI screening call — tokens + estimated cost, for the
-- consumption panel in the new provider settings tab.
create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  record_id uuid not null references public.records (id) on delete cascade,
  provider text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  estimated_cost numeric,
  created_at timestamptz not null default now()
);

create index ai_usage_log_project_id_idx on public.ai_usage_log (project_id);

alter table public.ai_usage_log enable row level security;
create policy "owner can view own usage log" on public.ai_usage_log
  for select to authenticated using (public.project_role(project_id) = 'owner');
-- No insert policy for `authenticated` — only the service role (inside
-- api/ai-screen.ts) writes here, same reasoning as project_ai_providers.

-- ai_screenings.criteria_detail -------------------------------------------
-- Persists the per-criterion breakdown the model already returns today
-- (ScreeningResultSchema.criteria) but api/ai-screen.ts discards after the
-- call — the prerequisite for the per-article audit view.
alter table public.ai_screenings add column criteria_detail jsonb not null default '[]';

-- v_ai_screening_stats ----------------------------------------------------
-- Deliberately a new, separate view rather than extending v_prisma_counts
-- or v_conflicts (current definitions confirmed live via pg_get_viewdef —
-- 0018_ai_formal_reviewer.sql only touched v_record_stage_decisions, not
-- these). Those describe final eligibility consensus (human, or human+AI
-- when ai_counts_as_reviewer is on); this is a different metric — how many
-- records the AI itself has screened and what it decided, regardless of
-- consensus or of whether AI counts as a formal reviewer.
create view public.v_ai_screening_stats with (security_invoker = true) as
select r.project_id, a.stage, a.decision, count(*) as count
from public.ai_screenings a
join public.records r on r.id = a.record_id
group by r.project_id, a.stage, a.decision;
