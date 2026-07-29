import type { AIProvider } from '@/types/domain'

export type ModelTier = 'free' | 'cheap' | 'mid' | 'robust'

export const MODEL_TIER_LABELS: Record<ModelTier, string> = {
  free: 'Gratuito',
  cheap: 'Mais barato',
  mid: 'Intermediário',
  robust: 'Mais robusto',
}

interface CuratedModel {
  value: string
  label: string
  tier: ModelTier
}

/**
 * Curated model lists per provider — a plain dropdown, not free text, per
 * the product decision. Names/pricing on these platforms change often;
 * double-check availability (especially free-tier status on OpenRouter and
 * Google's aggressive model retirements) before relying on this list in
 * production. `tier` is just a cost/capability hint shown next to each
 * option, not an enforced constraint.
 */
export const CURATED_MODELS: Record<AIProvider, CuratedModel[]> = {
  google: [
    // The entire Gemini 2.x line has been shut down (2.0 Flash) or is
    // returning early 404s ahead of its announced sunset (2.5 Flash /
    // Flash-Lite, since July 2026) — confirmed both in production here
    // and via Google's own developer forum. Moved to the 3.x generation.
    // Re-verify on ai.google.dev/gemini-api/docs/pricing before reusing a
    // dated model name here again.
    { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', tier: 'cheap' },
    { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', tier: 'mid' },
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview)', tier: 'robust' },
  ],
  groq: [
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', tier: 'cheap' },
    { value: 'gemma2-9b-it', label: 'Gemma2 9B IT', tier: 'cheap' },
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', tier: 'mid' },
    { value: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', tier: 'robust' },
  ],
  openrouter: [
    // OpenRouter's free catalog turns over fast (its own docs warn
    // against relying on any single :free endpoint long-term) — these
    // two were confirmed live via openrouter.ai/collections/free-models
    // in July 2026; the previous Llama 3.3/Gemini 2.0 entries here had
    // already been delisted.
    { value: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free)', tier: 'free' },
    { value: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (free)', tier: 'free' },
    { value: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', tier: 'cheap' },
    { value: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5', tier: 'robust' },
  ],
  anthropic: [
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', tier: 'cheap' },
    { value: 'claude-sonnet-5', label: 'Claude Sonnet 5', tier: 'mid' },
    { value: 'claude-opus-5', label: 'Claude Opus 5', tier: 'robust' },
  ],
}

export const PROVIDER_ORDER: AIProvider[] = ['google', 'groq', 'openrouter', 'anthropic']

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  google: 'Google Gemini',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic Claude',
}
