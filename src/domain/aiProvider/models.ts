import type { AIProvider } from '@/types/domain'

/**
 * Curated model lists per provider — a plain dropdown, not free text, per
 * the product decision. Names/pricing on these platforms change often;
 * double-check availability (especially free-tier status on OpenRouter)
 * before relying on this list in production.
 */
export const CURATED_MODELS: Record<AIProvider, { value: string; label: string }[]> = {
  google: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    { value: 'gemma2-9b-it', label: 'Gemma2 9B IT' },
  ],
  openrouter: [
    { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (free)' },
    { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash Exp (free)' },
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
