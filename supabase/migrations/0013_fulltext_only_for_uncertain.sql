-- Policy change: full-text review is for resolving UNCERTAIN title/abstract
-- decisions, not for re-confirming ones already marked INCLUDE. A record
-- INCLUDEd at title/abstract now counts straight toward the final included
-- total; only UNCERTAIN records go on to full-text, where that stage's own
-- INCLUDE/EXCLUDE is what decides them. So:
--   fulltext_sought  = title/abstract UNCERTAIN (was: title/abstract INCLUDE)
--   included_final   = title/abstract INCLUDE  +  full-text INCLUDE
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
    (
      select count(*) from public.v_record_final_decision f
      where f.project_id = p.id and f.stage = 'title_abstract' and f.final_decision = 'INCLUDE'
    ) + (
      select count(*) from public.v_record_final_decision f
      where f.project_id = p.id and f.stage = 'full_text' and f.final_decision = 'INCLUDE'
    )
  ) as included_final
from public.projects p;
