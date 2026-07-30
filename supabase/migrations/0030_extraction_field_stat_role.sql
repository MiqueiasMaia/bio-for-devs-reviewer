-- Optional statistical role for a number-typed extraction field (mean/SD/
-- sample size/scale bounds), same shape as criteria.picots_dimension —
-- nullable, checked enum, no fixed schema forced on projects that don't
-- use it. Lets the GRIM/SPRITE forensic check (src/domain/statForensics)
-- find "the mean field"/"the N field"/etc. among a project's fully
-- configurable extraction_fields. One field per role per project (a
-- project extracting multiple independent outcomes, each with its own
-- mean/SD/N, is out of scope for this check — see docs/pending-items.md
-- §7.2 for the simple single-outcome case this covers).
alter table public.extraction_fields
  add column stat_role text check (stat_role in ('mean', 'sd', 'n', 'min', 'max')),
  add constraint extraction_fields_stat_role_needs_number_type
    check (stat_role is null or field_type = 'number');

create unique index extraction_fields_stat_role_unique
  on public.extraction_fields (project_id, stat_role)
  where stat_role is not null;
