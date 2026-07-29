import { ScreeningResultSchema } from './schema.js'
import type { AIProviderCallArgs, AIProviderResult } from './types.js'

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

const RETRY_NOTE =
  'Sua resposta anterior não era um JSON válido. Responda APENAS com um JSON válido no formato pedido — sem texto adicional, sem markdown, sem blocos de código.'

interface ChatCompletionResponse {
  model?: string
  choices?: { message?: { content?: string } }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1].trim() : text.trim()
}

async function chatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<ChatCompletionResponse> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Provider request failed with status ${res.status}: ${body.slice(0, 300)}`)
  }
  return (await res.json()) as ChatCompletionResponse
}

/**
 * Groq and OpenRouter are both OpenAI-compatible chat-completions APIs —
 * one adapter, parameterized by base URL, no extra SDK dependency.
 * Structured-output reliability varies a lot across the free models these
 * two expose, so parsing is deliberately defensive: try a direct parse,
 * then look for a fenced ```json block, then retry once with a stricter
 * instruction. A record that still fails surfaces as a per-record error
 * (the caller already tolerates that — same shape as any other failure).
 */
export async function callOpenAiCompatible(baseUrl: string, args: AIProviderCallArgs): Promise<AIProviderResult> {
  let response = await chatCompletion(baseUrl, args.apiKey, args.model, args.systemPrompt, args.userMessage)
  let content = response.choices?.[0]?.message?.content ?? ''

  let parsed = tryParse(content)
  if (!parsed) {
    response = await chatCompletion(
      baseUrl,
      args.apiKey,
      args.model,
      `${args.systemPrompt}\n\n${RETRY_NOTE}`,
      args.userMessage,
    )
    content = response.choices?.[0]?.message?.content ?? ''
    parsed = tryParse(content)
  }
  if (!parsed) {
    throw new Error('Model did not return a valid structured result after retry')
  }

  return {
    decision: parsed.decision,
    confidence: parsed.confidence,
    rationale: parsed.rationale,
    criteria: parsed.criteria,
    modelUsed: response.model ?? args.model,
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  }
}

function tryParse(content: string): ReturnType<typeof ScreeningResultSchema.parse> | null {
  for (const candidate of [content, extractJsonBlock(content)]) {
    try {
      return ScreeningResultSchema.parse(JSON.parse(candidate))
    } catch {
      continue
    }
  }
  return null
}
