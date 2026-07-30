-- The previous uniqueness (record_id, stage, model_name) let re-running AI
-- screening with a DIFFERENT model (now possible since multi-model support
-- landed) add a second row instead of replacing the first — double-counting
-- v_ai_screening_stats and showing the same article twice in the AI Audit
-- list. Only the latest screening per (record, stage) should ever count,
-- regardless of which model produced it.

-- Keep only the most recently updated row per (record_id, stage); the
-- older one(s) are superseded, not additional data worth preserving.
delete from public.ai_screenings a
using (
  select id, row_number() over (
    partition by record_id, stage order by updated_at desc, created_at desc
  ) as rn
  from public.ai_screenings
) ranked
where a.id = ranked.id and ranked.rn > 1;

alter table public.ai_screenings
  drop constraint ai_screenings_record_stage_model_key;

alter table public.ai_screenings
  add constraint ai_screenings_record_stage_key unique (record_id, stage);
