-- Continuous retraction watch (see docs/pending-items.md §7.3): tracks the
-- most severe Crossref "update-to" notice found for an included record
-- (retraction, withdrawal, expression of concern, ...) — never overwritten
-- by a less severe one on a later check, so the flag survives even if a
-- later Crossref response happens to omit it. `retraction_checked_at` is
-- used to always check the least-recently-checked records next (a real
-- "continuous" watch, unlike unpaywall_checked_at/snowball_expanded_at
-- which are one-shot flags) — see api/check-retractions.ts.
alter table public.records
  add column retraction_status text,
  add column retraction_notice_doi text,
  add column retraction_checked_at timestamptz;

create index records_retraction_checked_at_idx on public.records (retraction_checked_at);
