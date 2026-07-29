-- Title/abstract translation cache -------------------------------------
-- Translated once (via the MyMemory API, called directly from the
-- browser — no server-side function needed) and shared across every
-- reviewer on the project. No new RLS policy required: the existing
-- "owner/reviewer can manage records" policy already covers UPDATE on
-- any column of a row the reviewer has access to (RLS is per-row, not
-- per-column).
alter table public.records add column title_translated text;
alter table public.records add column abstract_translated text;
alter table public.records add column translated_at timestamptz;
