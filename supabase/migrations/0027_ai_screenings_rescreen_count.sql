-- Tracks how many times each record has been (re)screened by the AI, and
-- enforces strict round-robin reprocessing: an article can only reach
-- rescreen_count N+1 once every other article in the same project/stage
-- has already reached N (listRecordIdsToScreen in
-- src/features/aiScreening/api.ts orders batches by this column ascending,
-- so the globally least-reprocessed records are always exhausted first).
alter table public.ai_screenings
  add column rescreen_count integer not null default 1;

-- Every upsert after the first insert is, by definition, a reprocessing —
-- api/ai-screen.ts is the only writer of this table (confirmed: no other
-- code path updates ai_screenings), so an unconditional bump on UPDATE is
-- safe and needs no application-code changes to the upsert payload itself.
create or replace function public.bump_ai_screening_rescreen_count()
returns trigger
language plpgsql
as $$
begin
  new.rescreen_count = old.rescreen_count + 1;
  return new;
end;
$$;

create trigger ai_screenings_bump_rescreen_count
  before update on public.ai_screenings
  for each row execute function public.bump_ai_screening_rescreen_count();
