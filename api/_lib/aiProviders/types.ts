import type { Decision } from '../../../src/types/domain.js'

export interface AICriterionResult {
  criterion: string
  kind: 'inclusion' | 'exclusion'
  met: boolean
  note: string
}

export interface AIProviderCallArgs {
  apiKey: string
  model: string
  systemPrompt: string
  userMessage: string
}

export interface AIProviderResult {
  decision: Decision
  confidence: number
  rationale: string
  criteria: AICriterionResult[]
  modelUsed: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
}
