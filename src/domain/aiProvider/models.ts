import type { AIProvider } from '@/types/domain'

/**
 * Curated model lists per provider — a plain dropdown, not free text, per
 * the product decision. Names/pricing on these platforms change often;
 * double-check availability (especially free-tier status on OpenRouter)
 * before relying on this list in production.
 */
export const CURATED_MODELS: Record<AIProvider, { value: string; label: string }[]> = {
  google: [
    // The entire Gemini 2.x line has been shut down (2.0 Flash) or is
    // returning early 404s ahead of its announced sunset (2.5 Flash /
    // Flash-Lite, since July 2026) — confirmed both in production here
    // and via Google's own developer forum. Moved to the 3.x generation;
    // gemini-3.1-flash-lite is the cheapest confirmed-current model as of
    // July 2026 ($0.13/$0.75 per million tokens). Re-verify on
    // ai.google.dev/gemini-api/docs/pricing before reusing a dated model
    // name here again.
    { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
    { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    { value: 'gemma2-9b-it', label: 'Gemma2 9B IT' },
  ],
  openrouter: [
    // OpenRouter's free catalog turns over fast (its own docs warn
    // against relying on any single :free endpoint long-term) — these
    // two were confirmed live via openrouter.ai/collections/free-models
    // in July 2026; the previous Llama 3.3/Gemini 2.0 entries here had
    // already been delisted.
    { value: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free)' },
    { value: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (free)' },
  ],
  anthropic: [{ value: 'claude-opus-4-8', label: 'Claude Opus 4.8' }],
}

export const PROVIDER_ORDER: AIProvider[] = ['google', 'groq', 'openrouter', 'anthropic']

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  google: 'Google Gemini',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic Claude',
}
