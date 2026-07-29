import { GoogleGenAI, type Schema } from '@google/genai'
import { z } from 'zod'
import { ScreeningResultSchema } from './schema.js'
import type { AIProviderCallArgs, AIProviderResult } from './types.js'

/** Gemini's responseSchema only supports a subset of JSON Schema (no
 * additionalProperties, no top-level $schema) — this schema has no shared/
 * recursive sub-schemas, so zod's native toJSONSchema (v4+) inlines
 * everything without $ref already; this just strips the couple of
 * keywords Gemini rejects outright. */
function toGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toGeminiSchema)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      if (key === 'additionalProperties' || key === '$schema') continue
      out[key] = toGeminiSchema(val)
    }
    return out
  }
  return value
}

const responseSchema = toGeminiSchema(z.toJSONSchema(ScreeningResultSchema)) as Schema

export async function callGemini(args: AIProviderCallArgs): Promise<AIProviderResult> {
  const ai = new GoogleGenAI({ apiKey: args.apiKey })

  const response = await ai.models.generateContent({
    model: args.model,
    contents: args.userMessage,
    config: {
      systemInstruction: args.systemPrompt,
      responseMimeType: 'application/json',
      responseSchema,
    },
  })

  const text = response.text
  if (!text) throw new Error('Gemini did not return a text response')

  const parsed = ScreeningResultSchema.parse(JSON.parse(text))

  return {
    decision: parsed.decision,
    confidence: parsed.confidence,
    rationale: parsed.rationale,
    criteria: parsed.criteria,
    modelUsed: args.model,
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    },
  }
}
