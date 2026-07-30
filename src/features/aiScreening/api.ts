import { supabase } from '@/lib/supabase'
import type { Decision, ScreeningStage } from '@/types/domain'
import { orderForRescreening } from './rescreenOrder'

export async function listUnscreenedRecordIds(
  projectId: string,
  stage: ScreeningStage,
  limit: number,
): Promise<string[]> {
  return listRecordIdsToScreen(projectId, stage, limit, false)
}

/** `includeAlreadyScreened: true` re-sends every non-duplicate record,
 * regardless of whether the AI already screened it — the backend upserts
 * on (record_id, stage, model_name), so this is how a batch re-run works.
 * Strict round-robin by `ai_screenings.rescreen_count` (never-screened
 * records first, i.e. count 0, then lowest count first, tie-broken by
 * oldest updated_at): a record can only reach rescreen N+1 once every
 * other record in this project/stage has already reached N, since the
 * globally lowest-count records always sort first and get exhausted
 * before the query ever returns a higher-count one. A fixed human_ref
 * order (the previous approach) would instead pick the exact same first
 * `limit` records every time the batch is re-run. */
export async function listRecordIdsToScreen(
  projectId: string,
  stage: ScreeningStage,
  limit: number,
  includeAlreadyScreened: boolean,
): Promise<string[]> {
  const { data: records, error } = await supabase
    .from('records')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_duplicate', false)
    .order('human_ref', { ascending: true })
  if (error) throw error

  const { data: alreadyScreened, error: aiError } = await supabase
    .from('ai_screenings')
    .select('record_id, rescreen_count, updated_at, records!inner(project_id)')
    .eq('records.project_id', projectId)
    .eq('stage', stage)
    .returns<{ record_id: string; rescreen_count: number; updated_at: string }[]>()
  if (aiError) throw aiError
  const screenedById = new Map(alreadyScreened.map((r) => [r.record_id, r]))

  if (!includeAlreadyScreened) {
    return records.map((r) => r.id).filter((id) => !screenedById.has(id)).slice(0, limit)
  }

  const infoById = new Map(
    [...screenedById.entries()].map(([id, r]) => [id, { rescreenCount: r.rescreen_count, updatedAt: r.updated_at }]),
  )
  return orderForRescreening(
    records.map((r) => r.id),
    infoById,
  ).slice(0, limit)
}

export interface RescreenRoundInfo {
  /** Lowest rescreen_count among screened records — every record has been
   * reprocessed at least this many times; this is the "round" that just
   * finished completing across the whole project/stage. */
  minCount: number
  /** Highest rescreen_count — records already pulled ahead into the next round. */
  maxCount: number
  screenedCount: number
}

/** Summarizes reprocessing progress for the transparency note in
 * AiScreeningCard — see listRecordIdsToScreen's round-robin ordering. */
export async function fetchRescreenRoundInfo(
  projectId: string,
  stage: ScreeningStage,
): Promise<RescreenRoundInfo | null> {
  const { data, error } = await supabase
    .from('ai_screenings')
    .select('rescreen_count, records!inner(project_id)')
    .eq('records.project_id', projectId)
    .eq('stage', stage)
    .returns<{ rescreen_count: number }[]>()
  if (error) throw error
  if (data.length === 0) return null
  const counts = data.map((d) => d.rescreen_count)
  return { minCount: Math.min(...counts), maxCount: Math.max(...counts), screenedCount: data.length }
}

export interface AiScreenResult {
  recordId: string
  decision?: Decision
  confidence?: number
  error?: string
}

export async function runAiScreening(
  projectId: string,
  recordIds: string[],
  stage: ScreeningStage,
): Promise<AiScreenResult[]> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('No active session')

  const CHUNK = 25
  const allResults: AiScreenResult[] = []
  for (let i = 0; i < recordIds.length; i += CHUNK) {
    const chunk = recordIds.slice(i, i + CHUNK)
    const res = await fetch('/api/ai-screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ projectId, recordIds: chunk, stage }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? `Request failed with status ${res.status}`)
    }
    const body = (await res.json()) as { results: AiScreenResult[] }
    allResults.push(...body.results)
  }
  return allResults
}
