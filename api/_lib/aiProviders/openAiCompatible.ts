import { ScreeningResultSchema } from './schema.js'
import type { AIProviderCallArgs, AIProviderResult } from './types.js'

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// OpenAI-compatible APIs (Groq, OpenRouter) reject response_format:
// json_object with a 400 unless the word "json" literally appears
// somewhere in the messages — this isn't optional, so it's appended to
// every call, not just the retry. The concrete example (not just a prose
// description) matters a lot for smaller free models: without it, a
// model answering in Portuguese tends to translate enum-like fields too
// ("kind": "Inclusão" instead of "inclusion", "met": "Metade" instead of
// a strict boolean) even when the field names are in English — seen in
// practice with Groq's Llama models. normalizeCriteria() below is a
// second line of defense for whatever still slips through.
const JSON_MODE_NOTE = [
  'Responda APENAS com um objeto JSON válido, sem texto fora do JSON, sem markdown, sem blocos de código.',
  'Os valores de "kind" e "met" devem ser EXATAMENTE como no exemplo abaixo (em inglês, "met" é um boolean literal, nunca um texto) — mesmo respondendo em português nos campos de texto livre (rationale, note):',
  JSON.stringify(
    {
      decision: 'INCLUDE',
      confidence: 0.8,
      rationale: 'Texto livre em português explicando a decisão.',
      criteria: [
        { criterion: 'Nome do critério', kind: 'inclusion', met: true, note: 'Texto livre em português.' },
        { criterion: 'Outro critério', kind: 'exclusion', met: false, note: 'Texto livre em português.' },
      ],
    },
    null,
    2,
  ),
].join('\n')

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

const KIND_ALIASES: Record<string, 'inclusion' | 'exclusion'> = {
  inclusion: 'inclusion',
  inclusão: 'inclusion',
  inclusao: 'inclusion',
  include: 'inclusion',
  exclusion: 'exclusion',
  exclusão: 'exclusion',
  exclusao: 'exclusion',
  exclude: 'exclusion',
}

const TRUE_ALIASES = new Set(['true', 'sim', 'yes', 'verdadeiro', 'atendido', 'atende'])
const FALSE_ALIASES = new Set(['false', 'não', 'nao', 'no', 'falso', 'não atendido', 'nao atendido'])

function normalizeKind(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return KIND_ALIASES[value.trim().toLowerCase()] ?? value
}

function normalizeMet(value: unknown): unknown {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return value
  const lower = value.trim().toLowerCase()
  if (TRUE_ALIASES.has(lower)) return true
  if (FALSE_ALIASES.has(lower)) return false
  // Free-text/partial answers (e.g. "Metade") can't be expressed as a
  // strict boolean — default to false (not clearly met) rather than
  // guessing true, matching this app's "favor recall, prefer
  // UNCERTAIN/false over a confident guess" stance elsewhere.
  return false
}

/** Second line of defense after JSON_MODE_NOTE's example — normalizes the
 * couple of fields free models most often answer in Portuguese/free text
 * instead of the exact literal values the schema requires. */
function normalizeCriteria(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.criteria)) return raw
  return {
    ...obj,
    criteria: obj.criteria.map((c) => {
      if (!c || typeof c !== 'object') return c
      const item = c as Record<string, unknown>
      return { ...item, kind: normalizeKind(item.kind), met: normalizeMet(item.met) }
    }),
  }
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
      const normalized = normalizeCriteria(JSON.parse(candidate))
      return { ok: true, value: ScreeningResultSchema.parse(normalized) }
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'unknown parse error'
    }
  }
  return { ok: false, reason: lastReason }
}
