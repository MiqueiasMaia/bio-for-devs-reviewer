-- Pricing rows for the "robust"/higher tier models added to the curated
-- lists (src/domain/aiProvider/models.ts) alongside the existing cheap
-- defaults, so users can pick a more capable model when accuracy matters
-- more than cost. Prices confirmed live in July 2026 via each provider's
-- own pricing page/API — re-check before reusing these numbers later.
insert into public.ai_pricing (provider, model, input_price_per_million_tokens, output_price_per_million_tokens) values
  ('google', 'gemini-3.1-pro-preview', 2.00, 12.00),
  ('groq', 'openai/gpt-oss-120b', 0.15, 0.75),
  ('openrouter', 'openai/gpt-oss-120b', 0.037, 0.17),
  ('openrouter', 'anthropic/claude-sonnet-5', 2.00, 10.00),
  ('anthropic', 'claude-haiku-4-5', 1.00, 5.00),
  ('anthropic', 'claude-sonnet-5', 2.00, 10.00),
  ('anthropic', 'claude-opus-5', 5.00, 25.00)
on conflict (provider, model) do nothing;
