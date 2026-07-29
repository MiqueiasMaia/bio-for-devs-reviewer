-- Archiving a project is just a soft-delete marker on the row itself — no
-- new RLS policy is needed since the existing "owner can update project"
-- policy already covers setting/clearing this column, and the existing
-- "owner can delete project" policy already covers permanent deletion.
alter table public.projects add column archived_at timestamptz;
