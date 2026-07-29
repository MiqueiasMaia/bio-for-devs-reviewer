-- Pricing rows for the models the curated list moved to after Google
-- retired the entire Gemini 2.x line (see src/domain/aiProvider/models.ts)
-- and OpenRouter's free catalog turned over. Existing rows for the old,
-- now-unreachable model names are left in place (harmless — they just
-- never match a call again) rather than deleted, consistent with how
-- ai_pricing has been treated as an append-only reference table so far.
insert into public.ai_pricing (provider, model, input_price_per_million_tokens, output_price_per_million_tokens) values
  ('google', 'gemini-3.1-flash-lite', 0.13, 0.75),
  ('google', 'gemini-3.5-flash-lite', 0.30, 2.50),
  ('openrouter', 'google/gemma-4-26b-a4b-it:free', 0, 0),
  ('openrouter', 'openai/gpt-oss-20b:free', 0, 0)
on conflict (provider, model) do nothing;
