-- Tracks whether an INCLUDEd record has already been used as a seed for
-- citation-expansion (snowballing, see api/snowball.ts) — so a re-run only
-- processes records that became INCLUDE since the last run, instead of
-- re-querying OpenAlex for every already-expanded seed every time. Left
-- null for records without a DOI too (they can never be seeds — the query
-- that selects candidates already filters on `doi is not null`, so no
-- separate handling is needed for them here).
alter table public.records
  add column snowball_expanded_at timestamptz;
