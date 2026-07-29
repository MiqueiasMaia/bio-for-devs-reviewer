-- fulltext_assessed and excluded_fulltext previously counted ANY
-- screenings/final_decision row for stage='full_text', unscoped — so they
-- could include leftover full-text decisions made on records that are
-- title/abstract INCLUDE (legitimate under the pre-0013 policy, off-policy
-- now that full-text is only for UNCERTAIN records). That let
-- fulltext_assessed exceed fulltext_sought and broke the identity
-- "assessed = excluded_fulltext + included-via-full-text". Scope both to
-- the same eligible set as fulltext_sought (title/abstract UNCERTAIN). The
-- stale rows stay in `screenings` (nothing is deleted) but no longer skew
-- the PRISMA report.
create or replace view public.v_prisma_counts with (security_invoker = true) as
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
    where f.project_id = p.id and f.stage = 'title_abstract' and f.final_decision = 'UNCERTAIN'
  ) as fulltext_sought,
  (
    select count(distinct s.record_id)
    from public.screenings s
    join public.v_record_final_decision ta
      on ta.record_id = s.record_id and ta.stage = 'title_abstract' and ta.final_decision = 'UNCERTAIN'
    where s.stage = 'full_text' and ta.project_id = p.id
  ) as fulltext_assessed,
  (
    select count(*)
    from public.v_record_final_decision f
    join public.v_record_final_decision ta
      on ta.record_id = f.record_id and ta.stage = 'title_abstract' and ta.final_decision = 'UNCERTAIN'
    where f.project_id = p.id and f.stage = 'full_text' and f.final_decision = 'EXCLUDE'
  ) as excluded_fulltext,
  (
    select count(distinct ta.record_id)
    from public.v_record_final_decision ta
    left join public.v_record_final_decision ft
      on ft.record_id = ta.record_id and ft.stage = 'full_text'
    where ta.project_id = p.id
      and ta.stage = 'title_abstract'
      and (
        ta.final_decision = 'INCLUDE'
        or (ta.final_decision = 'UNCERTAIN' and ft.final_decision = 'INCLUDE')
      )
  ) as included_final
from public.projects p;

-- Same unscoped-legacy-data issue in the exclusion-reasons breakdown: scope
-- it to the same eligible (title/abstract UNCERTAIN) set too.
create or replace view public.v_fulltext_exclusion_reasons with (security_invoker = true) as
select
  r.project_id,
  reason_code,
  count(*) as count
from public.records r
join public.screenings s on s.record_id = r.id and s.stage = 'full_text'
join public.v_record_final_decision f
  on f.record_id = r.id and f.stage = 'full_text' and f.final_decision = 'EXCLUDE'
join public.v_record_final_decision ta
  on ta.record_id = r.id and ta.stage = 'title_abstract' and ta.final_decision = 'UNCERTAIN'
cross join lateral unnest(s.reasons) as reason_code
group by r.project_id, reason_code;
