-- v_dedup_groups ------------------------------------------------------------
-- One row per duplicate cluster, for the dedup review screen.
create view public.v_dedup_groups with (security_invoker = true) as
select
  r.project_id,
  r.dedup_group_id,
  count(*) as member_count,
  array_agg(r.id order by r.dedup_primary desc, r.created_at) as record_ids,
  bool_or(r.dedup_primary) as has_primary
from public.records r
where r.dedup_group_id is not null
group by r.project_id, r.dedup_group_id;

-- v_record_stage_decisions ---------------------------------------------
-- Raw decision matrix: every reviewer's decision for a record at a stage,
-- collapsed to one row per (record, stage) with aggregate counts. This is
-- the input both the conflict view and the PRISMA counts view build on.
create view public.v_record_stage_decisions with (security_invoker = true) as
select
  r.id as record_id,
  r.project_id,
  s.stage,
  jsonb_agg(
    jsonb_build_object(
      'reviewer_id', s.reviewer_id,
      'decision', s.decision,
      'reasons', s.reasons,
      'decided_at', s.decided_at
    )
    order by s.decided_at
  ) as reviewer_decisions,
  count(*) as reviews_count,
  count(distinct s.decision) as distinct_decision_count,
  (array_agg(s.decision order by s.decided_at))[1] as first_decision
from public.records r
join public.screenings s on s.record_id = r.id
group by r.id, r.project_id, s.stage;

-- v_record_final_decision ------------------------------------------------
-- The decision that actually counts for PRISMA/progression purposes:
--   * if a resolution exists for this (record, stage), it wins outright;
--   * else, if every reviewer who has screened so far agrees AND the
--     required reviewer count (project.settings.reviewers_required_per_record)
--     has been met, that unanimous decision is final;
--   * otherwise there is no final decision yet (still pending, or in
--     conflict — see is_conflict).
create view public.v_record_final_decision with (security_invoker = true) as
select
  r.id as record_id,
  r.project_id,
  d.stage,
  d.reviews_count,
  d.distinct_decision_count,
  coalesce((p.settings ->> 'reviewers_required_per_record')::int, 2) as reviewers_required,
  res.resolved_decision,
  case
    when res.resolved_decision is not null then res.resolved_decision
    when d.distinct_decision_count = 1
      and d.reviews_count >= coalesce((p.settings ->> 'reviewers_required_per_record')::int, 2)
      then d.first_decision
    else null
  end as final_decision,
  (
    d.distinct_decision_count > 1
    and d.reviews_count >= coalesce((p.settings ->> 'reviewers_required_per_record')::int, 2)
    and res.resolved_decision is null
  ) as is_conflict
from public.records r
join public.v_record_stage_decisions d on d.record_id = r.id
join public.projects p on p.id = r.project_id
left join public.resolutions res on res.record_id = r.id and res.stage = d.stage;

-- v_conflicts -------------------------------------------------------------
create view public.v_conflicts with (security_invoker = true) as
select *
from public.v_record_final_decision
where is_conflict;

-- v_prisma_counts -----------------------------------------------------------
-- One row per project with the PRISMA 2020 flow-diagram numbers. The UI
-- (Stage 5) renders the diagram straight from this view — no hand-entered
-- counts anywhere.
create view public.v_prisma_counts with (security_invoker = true) as
select
  p.id as project_id,
  (select count(*) from public.records r where r.project_id = p.id) as records_identified,
  (select count(*) from public.records r where r.project_id = p.id and r.is_duplicate) as duplicates_removed,
  (select count(*) from public.records r where r.project_id = p.id and not r.is_duplicate) as records_screened_ta,
  (
    select count(*) from public.v_record_final_decision f
    where f.project_id = p.id and f.stage = 'title_abstract' and f.final_decision = 'EXCLUDE'
  ) as excluded_ta,
  (
    select count(*) from public.v_record_final_decision f
    where f.project_id = p.id and f.stage = 'title_abstract' and f.final_decision = 'INCLUDE'
  ) as fulltext_sought,
  (
    select count(distinct s.record_id) from public.screenings s
    join public.records r on r.id = s.record_id
    where r.project_id = p.id and s.stage = 'full_text'
  ) as fulltext_assessed,
  (
    select count(*) from public.v_record_final_decision f
    where f.project_id = p.id and f.stage = 'full_text' and f.final_decision = 'EXCLUDE'
  ) as excluded_fulltext,
  (
    select count(*) from public.v_record_final_decision f
    where f.project_id = p.id and f.stage = 'full_text' and f.final_decision = 'INCLUDE'
  ) as included_final
from public.projects p;

-- v_fulltext_exclusion_reasons ------------------------------------------
-- Reason-code tallies for the full-text exclusion box of the PRISMA diagram.
create view public.v_fulltext_exclusion_reasons with (security_invoker = true) as
select
  r.project_id,
  reason_code,
  count(*) as count
from public.records r
join public.screenings s on s.record_id = r.id and s.stage = 'full_text'
join public.v_record_final_decision f
  on f.record_id = r.id and f.stage = 'full_text' and f.final_decision = 'EXCLUDE'
cross join lateral unnest(s.reasons) as reason_code
group by r.project_id, reason_code;

-- Views inherit RLS from their underlying tables' policies (Postgres checks
-- the querying user's grants on the base tables through the view), so no
-- separate policies are needed here.
