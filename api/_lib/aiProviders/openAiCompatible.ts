import { ScreeningResultSchema } from './schema.js'
import type { AIProviderCallArgs, AIProviderResult } from './types.js'

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// OpenAI-compatible APIs (Groq, OpenRouter) reject response_format:
// json_object with a 400 unless the word "json" literally appears
// somewhere in the messages — this isn't optional, so it's appended to
// every call, not just the retry.
const JSON_MODE_NOTE =
  'Responda apenas com um objeto JSON válido, com exatamente estes campos: decision (string: "INCLUDE", "UNCERTAIN" ou "EXCLUDE"), confidence (número entre 0 e 1), rationale (string), criteria (array de objetos com criterion, kind, met, note). Sem texto fora do JSON, sem markdown, sem blocos de código.'

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
  const systemPromptWithJsonNote = `${args.systemPrompt}\n\n${JSON_MODE_NOTE}`

  let response = await chatCompletion(baseUrl, args.apiKey, args.model, systemPromptWithJsonNote, args.userMessage)
  let content = response.choices?.[0]?.message?.content ?? ''

  let parsed = tryParse(content)
  if (!parsed.ok) {
    response = await chatCompletion(
      baseUrl,
      args.apiKey,
      args.model,
      `${systemPromptWithJsonNote}\n\n${RETRY_NOTE}`,
      args.userMessage,
    )
    content = response.choices?.[0]?.message?.content ?? ''
    parsed = tryParse(content)
  }
  if (!parsed.ok) {
    // Includes a snippet of the actual raw response and why it didn't
    // validate — a bare "did not return a valid structured result" gives
    // no way to tell a JSON syntax error from a schema mismatch (wrong
    // field names, decision not uppercase, etc.) without this.
    throw new Error(
      `Model did not return a valid structured result after retry (${parsed.reason}). Raw response: ${content.slice(0, 500)}`,
    )
  }

  return {
    decision: parsed.value.decision,
    confidence: parsed.value.confidence,
    rationale: parsed.value.rationale,
    criteria: parsed.value.criteria,
    modelUsed: response.model ?? args.model,
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  }
}

type ParseResult =
  | { ok: true; value: ReturnType<typeof ScreeningResultSchema.parse> }
  | { ok: false; reason: string }

function tryParse(content: string): ParseResult {
  let lastReason = 'empty response'
  for (const candidate of [content, extractJsonBlock(content)]) {
    try {
      return { ok: true, value: ScreeningResultSchema.parse(JSON.parse(candidate)) }
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'unknown parse error'
    }
  }
  return { ok: false, reason: lastReason }
}
