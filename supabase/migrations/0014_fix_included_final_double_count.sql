-- Fix: 0013's included_final summed two separate counts (title/abstract
-- INCLUDE + full-text INCLUDE), which double-counts any record that is
-- title/abstract INCLUDE *and* also happens to have a full-text screening
-- resolving to INCLUDE — e.g. leftover full-text decisions made under the
-- old policy (full-text open to every TA-INCLUDE record), now stale but
-- still sitting in `screenings`. A record must count once: either it was
-- INCLUDEd directly at title/abstract, or it was UNCERTAIN there and got
-- promoted to INCLUDE at full-text. Any full-text decision on a record
-- that's already TA-INCLUDE is ignored (it already counts via that branch).
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
    select count(distinct s.record_id) from public.screenings s
    join public.records r on r.id = s.record_id
    where r.project_id = p.id and s.stage = 'full_text'
  ) as fulltext_assessed,
  (
    select count(*) from public.v_record_final_decision f
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
