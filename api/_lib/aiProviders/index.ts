import type { AIProvider } from '../../../src/types/domain.js'
import { callAnthropic } from './anthropic.js'
import { callGemini } from './gemini.js'
import { callOpenAiCompatible, GROQ_BASE_URL, OPENROUTER_BASE_URL } from './openAiCompatible.js'
import type { AIProviderCallArgs, AIProviderResult } from './types.js'

export type { AIProviderCallArgs, AIProviderResult } from './types.js'

export function callAIProvider(provider: AIProvider, args: AIProviderCallArgs): Promise<AIProviderResult> {
  switch (provider) {
    case 'anthropic':
      return callAnthropic(args)
    case 'google':
      return callGemini(args)
    case 'groq':
      return callOpenAiCompatible(GROQ_BASE_URL, args)
    case 'openrouter':
      return callOpenAiCompatible(OPENROUTER_BASE_URL, args)
  }
}
