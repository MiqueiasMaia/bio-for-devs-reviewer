import { supabase } from '@/lib/supabase'

export interface FlaggedRecord {
  id: string
  humanRef: string
  title: string
  status: string
  noticeDoi: string | null
  checkedAt: string | null
}

export interface RetractionSummary {
  totalIncludedWithDoi: number
  checkedCount: number
  flagged: FlaggedRecord[]
}

/** Same "INCLUDEd" definition used by dataExtraction/riskOfBias/snowball —
 * INCLUDE at title_abstract, union INCLUDE at full_text. */
export async function fetchRetractionSummary(projectId: string): Promise<RetractionSummary> {
  const { data: finals, error: finalsError } = await supabase
    .from('v_record_final_decision')
    .select('record_id')
    .eq('project_id', projectId)
    .eq('final_decision', 'INCLUDE')
    .in('stage', ['title_abstract', 'full_text'])
  if (finalsError) throw finalsError
  const recordIds = [...new Set(finals.map((f) => f.record_id))]
  if (recordIds.length === 0) return { totalIncludedWithDoi: 0, checkedCount: 0, flagged: [] }

  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('id, human_ref, title, doi, retraction_status, retraction_notice_doi, retraction_checked_at')
    .in('id', recordIds)
  if (recordsError) throw recordsError

  const withDoi = records.filter((r) => r.doi)
  const checkedCount = withDoi.filter((r) => r.retraction_checked_at).length
  const flagged = withDoi
    .filter((r): r is typeof r & { retraction_status: string } => Boolean(r.retraction_status))
    .map((r) => ({
      id: r.id,
      humanRef: r.human_ref,
      title: r.title,
      status: r.retraction_status,
      noticeDoi: r.retraction_notice_doi,
      checkedAt: r.retraction_checked_at,
    }))

  return { totalIncludedWithDoi: withDoi.length, checkedCount, flagged }
}

export interface RetractionCheckResult {
  checked: number
  flagged: number
}

/** Server-side (see /api/check-retractions) since it fans out to a Crossref
 * call per record — this is the on-demand counterpart to the same
 * endpoint's daily Vercel Cron run (vercel.json), scoped to just this
 * project instead of every project. */
export async function runRetractionCheck(projectId: string, limit: number): Promise<RetractionCheckResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('No active session')

  const res = await fetch('/api/check-retractions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ projectId, limit }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed with status ${res.status}`)
  }
  return (await res.json()) as RetractionCheckResult
}
