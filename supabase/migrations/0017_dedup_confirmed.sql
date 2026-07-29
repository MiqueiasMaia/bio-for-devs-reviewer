-- Until now, a duplicate group's "primary" was picked automatically by
-- computeDedupGroups the moment a group was detected at import time (see
-- runImportPipeline), with no distinction between "a heuristic picked
-- this" and "a human (or the Auto Resolver) actually confirmed it". That
-- made has_primary effectively always true and useless as a "still needs
-- review" signal. dedup_confirmed adds that missing bit: it's only set on
-- the primary record once a human clicks "Manter este" in the dedup
-- wizard, or the Auto Resolver approves the group against chosen criteria.
alter table public.records add column dedup_confirmed boolean not null default false;

create or replace view public.v_dedup_groups with (security_invoker = true) as
select
  r.project_id,
  r.dedup_group_id,
  count(*) as member_count,
  array_agg(r.id order by r.dedup_primary desc, r.created_at) as record_ids,
  bool_or(r.dedup_primary) as has_primary,
  bool_or(r.dedup_primary and r.dedup_confirmed) as confirmed
from public.records r
where r.dedup_group_id is not null
group by r.project_id, r.dedup_group_id;
