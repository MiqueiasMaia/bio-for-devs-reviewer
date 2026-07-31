import { supabase } from '@/lib/supabase'
import type { Decision } from '@/types/domain'
import { rerankQueue, type RerankInputRecord, type RerankOutcome } from '@/domain/activeLearning/reranker'

function toRelevance(decision: Decision): 'relevant' | 'irrelevant' {
  // Either INCLUDE or UNCERTAIN keeps a record moving through the review
  // (straight to inclusion, or on to full-text); only EXCLUDE is "done,
  // not relevant" — the same binary the reranker needs.
  return decision === 'EXCLUDE' ? 'irrelevant' : 'relevant'
}

/** Every non-duplicate record's title/abstract text plus its settled
 * title_abstract decision, if any — a record still mid-conflict or short
 * of the required review count has no `final_decision`, so it's a scoring
 * target here, not training data. */
async function fetchRerankInput(projectId: string): Promise<RerankInputRecord[]> {
  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('id, title, abstract')
    .eq('project_id', projectId)
    .eq('is_duplicate', false)
  if (recordsError) throw recordsError

  const { data: finals, error: finalsError } = await supabase
    .from('v_record_final_decision')
    .select('record_id, final_decision')
    .eq('project_id', projectId)
    .eq('stage', 'title_abstract')
  if (finalsError) throw finalsError
  const decisionByRecord = new Map(finals.map((f) => [f.record_id, f.final_decision]))

  return records.map((r) => {
    const decision = decisionByRecord.get(r.id)
    return { id: r.id, title: r.title, abstract: r.abstract, decision: decision ? toRelevance(decision) : null }
  })
}

/** Retrains on-demand (see ActiveLearningCard's "Retreinar e reordenar"
 * button) and, when there's enough data, writes the new scores back via
 * `set_relevance_scores` — one round trip instead of one UPDATE per
 * record. Runs entirely client-side: no secrets, no server component, just
 * math over data the reviewer already has RLS access to. */
export async function runRerank(projectId: string): Promise<RerankOutcome> {
  const input = await fetchRerankInput(projectId)
  const outcome = rerankQueue(input)
  if (outcome.status === 'trained' && outcome.result.scores.size > 0) {
    const ids = [...outcome.result.scores.keys()]
    const scores = [...outcome.result.scores.values()]
    const { error } = await supabase.rpc('set_relevance_scores', { p_record_ids: ids, p_scores: scores })
    if (error) throw error
  }
  return outcome
}

export interface RelevanceScoringStatus {
  lastScoredAt: string | null
  scoredCount: number
  totalEligible: number
}

export async function fetchScoringStatus(projectId: string): Promise<RelevanceScoringStatus> {
  const { data, error } = await supabase
    .from('records')
    .select('relevance_scored_at')
    .eq('project_id', projectId)
    .eq('is_duplicate', false)
  if (error) throw error

  let lastScoredAt: string | null = null
  let scoredCount = 0
  for (const r of data) {
    if (!r.relevance_scored_at) continue
    scoredCount++
    if (!lastScoredAt || r.relevance_scored_at > lastScoredAt) lastScoredAt = r.relevance_scored_at
  }
  return { lastScoredAt, scoredCount, totalEligible: data.length }
}
