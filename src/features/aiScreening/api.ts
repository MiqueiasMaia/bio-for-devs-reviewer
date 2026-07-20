import { supabase } from '@/lib/supabase'
import type { Decision, ScreeningStage } from '@/types/domain'

export async function listUnscreenedRecordIds(
  projectId: string,
  stage: ScreeningStage,
  limit: number,
): Promise<string[]> {
  const { data: alreadyScreened, error: aiError } = await supabase
    .from('ai_screenings')
    .select('record_id, records!inner(project_id)')
    .eq('records.project_id', projectId)
    .eq('stage', stage)
    .returns<{ record_id: string }[]>()
  if (aiError) throw aiError
  const screenedIds = new Set(alreadyScreened.map((r) => r.record_id))

  const { data: records, error } = await supabase
    .from('records')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_duplicate', false)
    .order('human_ref', { ascending: true })
  if (error) throw error

  return records.map((r) => r.id).filter((id) => !screenedIds.has(id)).slice(0, limit)
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
