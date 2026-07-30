import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildSystemPrompt, buildUserMessage } from '../src/domain/aiScreening/promptBuilder.js'
import { createAdminClient } from './_lib/supabaseAdmin.js'
import { callAIProvider } from './_lib/aiProviders/index.js'

const MAX_RECORDS_PER_REQUEST = 25
const CONCURRENCY = 3

interface RequestBody {
  projectId: string
  recordIds: string[]
  stage: 'title_abstract' | 'full_text'
}

function isValidBody(body: unknown): body is RequestBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.projectId === 'string' &&
    Array.isArray(b.recordIds) &&
    b.recordIds.every((id) => typeof id === 'string') &&
    (b.stage === 'title_abstract' || b.stage === 'full_text')
  )
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!isValidBody(req.body)) {
    res.status(400).json({ error: 'projectId, recordIds[] and stage are required' })
    return
  }
  const { projectId, stage } = req.body
  const recordIds = req.body.recordIds.slice(0, MAX_RECORDS_PER_REQUEST)

  const authHeader = req.headers.authorization
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization bearer token' })
    return
  }

  const admin = createAdminClient()

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken)
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Invalid session' })
    return
  }
  const userId = userData.user.id

  const { data: membership } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!membership || (membership.role !== 'owner' && membership.role !== 'reviewer')) {
    res.status(403).json({ error: 'Not a member of this project with screening access' })
    return
  }

  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .single()
  if (projectError || !project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  if (!project.settings.ai_screening_enabled) {
    res.status(403).json({ error: 'AI screening is not enabled for this project' })
    return
  }

  const secret = process.env.AI_KEY_ENCRYPTION_SECRET
  if (!secret) {
    res.status(500).json({ error: 'AI_KEY_ENCRYPTION_SECRET is not configured on the server' })
    return
  }

  const { data: aiConfigRows, error: aiConfigError } = await admin.rpc('get_project_ai_key', {
    p_project_id: projectId,
    p_secret: secret,
  })
  if (aiConfigError) {
    res.status(500).json({ error: aiConfigError.message })
    return
  }
  const aiConfig = aiConfigRows?.[0]
  if (!aiConfig) {
    // The actual enforcement point for "no provider configured" — the
    // Configurações UI also disables the ai_screening_enabled toggle for
    // this case, but this is where money would actually get spent.
    res.status(400).json({ error: 'No AI provider configured for this project' })
    return
  }
  const { provider, model, api_key: apiKey } = aiConfig

  const [{ data: criteria }, { data: exclusionReasons }, { data: records }, { data: pricing }] = await Promise.all([
    admin.from('criteria').select('kind, text, picots_dimension').eq('project_id', projectId),
    admin.from('exclusion_reasons').select('code, label').eq('project_id', projectId),
    admin
      .from('records')
      .select('id, title, authors, abstract, year')
      .eq('project_id', projectId)
      .in('id', recordIds),
    admin
      .from('ai_pricing')
      .select('input_price_per_million_tokens, output_price_per_million_tokens')
      .eq('provider', provider)
      .eq('model', model)
      .maybeSingle(),
  ])

  if (!records || records.length === 0) {
    res.status(404).json({ error: 'No matching records found for this project' })
    return
  }

  const systemPrompt = buildSystemPrompt(
    (criteria ?? []).map((c) => ({
      kind: c.kind,
      text: c.text,
      picotsDimension: c.picots_dimension,
    })),
    (exclusionReasons ?? []).map((r) => ({ code: r.code, label: r.label })),
  )

  const results = await runWithConcurrency(records, CONCURRENCY, async (record) => {
    try {
      const result = await callAIProvider(provider, {
        apiKey,
        model,
        systemPrompt,
        userMessage: buildUserMessage({
          title: record.title,
          authors: record.authors,
          abstract: record.abstract,
          year: record.year,
        }),
      })

      const { error: upsertError } = await admin.from('ai_screenings').upsert(
        {
          record_id: record.id,
          model_name: result.modelUsed,
          decision: result.decision,
          rationale: result.rationale,
          confidence: result.confidence,
          criteria_detail: result.criteria,
          stage,
        },
        { onConflict: 'record_id,stage' },
      )
      if (upsertError) return { recordId: record.id, error: upsertError.message }

      const estimatedCost = pricing
        ? (result.usage.inputTokens / 1_000_000) * pricing.input_price_per_million_tokens +
          (result.usage.outputTokens / 1_000_000) * pricing.output_price_per_million_tokens
        : null

      await admin.from('ai_usage_log').insert({
        project_id: projectId,
        record_id: record.id,
        provider,
        model: result.modelUsed,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        estimated_cost: estimatedCost,
      })

      return { recordId: record.id, decision: result.decision, confidence: result.confidence }
    } catch (err) {
      return { recordId: record.id, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  res.status(200).json({ results, count: results.length })
}
