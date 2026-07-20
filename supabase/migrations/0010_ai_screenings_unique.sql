-- Lets the AI-screening endpoint upsert (re-running screening for the same
-- record/stage/model updates the existing row instead of accumulating
-- duplicates every time it's re-triggered).
alter table public.ai_screenings
  add constraint ai_screenings_record_stage_model_key unique (record_id, stage, model_name);
