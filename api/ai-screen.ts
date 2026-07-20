import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { buildSystemPrompt, buildUserMessage } from '../src/domain/aiScreening/promptBuilder.js'
import { createAdminClient } from './_lib/supabaseAdmin.js'

const MAX_RECORDS_PER_REQUEST = 25
const CONCURRENCY = 3

const ScreeningResultSchema = z.object({
  decision: z.enum(['INCLUDE', 'UNCERTAIN', 'EXCLUDE']),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  criteria: z.array(
    z.object({
      criterion: z.string(),
      kind: z.enum(['inclusion', 'exclusion']),
      met: z.boolean(),
      note: z.string(),
    }),
  ),
})

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

  const apiKey = process.env.ANTHROPIC_API_KEY
  const model = process.env.ANTHROPIC_MODEL
  if (!apiKey || !model) {
    res.status(500).json({ error: 'AI screening is not configured on the server' })
    return
  }

  const [{ data: criteria }, { data: exclusionReasons }, { data: records }] = await Promise.all([
    admin.from('criteria').select('kind, text, picots_dimension').eq('project_id', projectId),
    admin.from('exclusion_reasons').select('code, label').eq('project_id', projectId),
    admin
      .from('records')
      .select('id, title, authors, abstract, year')
      .eq('project_id', projectId)
      .in('id', recordIds),
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

  const anthropic = new Anthropic({ apiKey })
  const outputFormat = zodOutputFormat(ScreeningResultSchema)

  const results = await runWithConcurrency(records, CONCURRENCY, async (record) => {
    try {
      const response = await anthropic.messages.parse({
        model,
        max_tokens: 1500,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: outputFormat },
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: buildUserMessage({
              title: record.title,
              authors: record.authors,
              abstract: record.abstract,
              year: record.year,
            }),
          },
        ],
      })

      if (!response.parsed_output) {
        return { recordId: record.id, error: 'Model did not return a valid structured result' }
      }

      const parsed = response.parsed_output
      const { error: upsertError } = await admin.from('ai_screenings').upsert(
        {
          record_id: record.id,
          model_name: response.model,
          decision: parsed.decision,
          rationale: parsed.rationale,
          confidence: parsed.confidence,
          stage,
        },
        { onConflict: 'record_id,stage,model_name' },
      )
      if (upsertError) return { recordId: record.id, error: upsertError.message }

      return { recordId: record.id, decision: parsed.decision, confidence: parsed.confidence }
    } catch (err) {
      return { recordId: record.id, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  res.status(200).json({ results, count: results.length })
}
