-- Tracks whether the automatic Unpaywall lookup has already run for a
-- record, so the full-text screening panel can trigger it on its own
-- (no button click needed) exactly once per record instead of re-querying
-- Unpaywall on every page visit. Set by /api/unpaywall-fetch after any
-- terminal outcome (attached or not) — a manual "buscar novamente" retry
-- still bypasses this via the existing endpoint, it just isn't automatic.
alter table public.records
  add column unpaywall_checked_at timestamptz;
