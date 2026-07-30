import { supabase } from '@/lib/supabase'
import type { Decision, ScreeningStage } from '@/types/domain'

export interface QueueRecord {
  id: string
  humanRef: string
  title: string
  authors: string
  abstract: string | null
  year: number | null
  journal: string | null
  doi: string | null
  sourceDb: string | null
  titleTranslated: string | null
  abstractTranslated: string | null
}

export interface ScreeningState {
  decision: Decision | null
  reasons: string[]
  notes: string
  decidedAt: string
}

export async function listEligibleRecordIds(projectId: string, stage: ScreeningStage): Promise<Set<string>> {
  if (stage === 'title_abstract') {
    const { data, error } = await supabase
      .from('records')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_duplicate', false)
    if (error) throw error
    return new Set(data.map((r) => r.id))
  }

  // full_text stage: only records that were UNCERTAIN at title_abstract.
  // INCLUDE at title_abstract counts straight toward the final included
  // total (see v_prisma_counts.included_final) instead of needing
  // full-text re-confirmation; full-text is specifically for resolving the
  // uncertain ones.
  const { data, error } = await supabase
    .from('v_record_final_decision')
    .select('record_id')
    .eq('project_id', projectId)
    .eq('stage', 'title_abstract')
    .eq('final_decision', 'UNCERTAIN')
  if (error) throw error
  return new Set(data.map((r) => r.record_id))
}

/**
 * Assignment rule (documented in the UI too): a reviewer's queue at a stage
 * is every eligible record that either (a) still needs more screenings
 * than it has so far (fewer than settings.reviewers_required_per_record,
 * from anyone) — new work — or (b) this reviewer has already screened it
 * themselves, regardless of how many screenings it has in total — so a
 * past decision is always reachable to reconsider, even after the record
 * reached consensus. A record fully decided by *other* reviewers, that
 * this one was never assigned to, still doesn't show up here.
 */
export async function fetchQueue(
  projectId: string,
  stage: ScreeningStage,
  reviewerId: string,
  reviewersRequired: number,
): Promise<QueueRecord[]> {
  const eligibleIds = await listEligibleRecordIds(projectId, stage)
  if (eligibleIds.size === 0) return []

  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select(
      'id, human_ref, title, authors, abstract, year, journal, doi, source_db, title_translated, abstract_translated',
    )
    .eq('project_id', projectId)
    .order('human_ref', { ascending: true })
  if (recordsError) throw recordsError

  const { data: decisions, error: decisionsError } = await supabase
    .from('v_record_stage_decisions')
    .select('record_id, reviews_count, reviewer_decisions')
    .eq('project_id', projectId)
    .eq('stage', stage)
  if (decisionsError) throw decisionsError

  const decisionByRecord = new Map(decisions.map((d) => [d.record_id, d]))

  return records
    .filter((r) => eligibleIds.has(r.id))
    .filter((r) => {
      const d = decisionByRecord.get(r.id)
      const reviewsCount = d?.reviews_count ?? 0
      const reviewerIds = new Set(
        ((d?.reviewer_decisions ?? []) as { reviewer_id: string | null }[]).map((x) => x.reviewer_id),
      )
      return reviewsCount < reviewersRequired || reviewerIds.has(reviewerId)
    })
    .map((r) => ({
      id: r.id,
      humanRef: r.human_ref,
      title: r.title,
      authors: r.authors,
      abstract: r.abstract,
      year: r.year,
      journal: r.journal,
      doi: r.doi,
      sourceDb: r.source_db,
      titleTranslated: r.title_translated,
      abstractTranslated: r.abstract_translated,
    }))
}

export async function fetchMyScreenings(
  reviewerId: string,
  stage: ScreeningStage,
): Promise<Map<string, ScreeningState>> {
  // Filtered by reviewer + stage only (not a record_id list) so this stays
  // a single small request regardless of project size — with hundreds of
  // records, `.in('record_id', ids)` risks hitting URL-length limits.
  // Screenings from the reviewer's other projects may come back too; that's
  // harmless since callers only ever look up ids from their own queue.
  const { data, error } = await supabase
    .from('screenings')
    .select('record_id, decision, reasons, notes, decided_at')
    .eq('reviewer_id', reviewerId)
    .eq('stage', stage)
  if (error) throw error
  return new Map(
    data.map((s) => [
      s.record_id,
      { decision: s.decision, reasons: s.reasons, notes: s.notes, decidedAt: s.decided_at },
    ]),
  )
}

export interface AiMatchState {
  decision: Decision
  confidence: number | null
}

/** For the Rayyan-style automated match indicator shown next to the
 * article while screening (see aiMatchBadge.ts) — one row per record for
 * this project/stage, keyed by record id. Joined through `records` to
 * scope by project since `ai_screenings` has no project_id of its own. */
export async function fetchAiMatchForStage(
  projectId: string,
  stage: ScreeningStage,
): Promise<Map<string, AiMatchState>> {
  const { data, error } = await supabase
    .from('ai_screenings')
    .select('record_id, decision, confidence, records!inner(project_id)')
    .eq('stage', stage)
    .eq('records.project_id', projectId)
    .returns<{ record_id: string; decision: Decision; confidence: number | null }[]>()
  if (error) throw error
  return new Map(data.map((s) => [s.record_id, { decision: s.decision, confidence: s.confidence }]))
}

export async function saveScreening(input: {
  recordId: string
  reviewerId: string
  stage: ScreeningStage
  decision: Decision
  reasons: string[]
  notes: string
}): Promise<void> {
  const { error } = await supabase.from('screenings').upsert(
    {
      record_id: input.recordId,
      reviewer_id: input.reviewerId,
      stage: input.stage,
      decision: input.decision,
      reasons: input.reasons,
      notes: input.notes,
      decided_at: new Date().toISOString(),
    },
    { onConflict: 'record_id,reviewer_id,stage' },
  )
  if (error) throw error
}

export interface QueueSummary {
  include: number
  uncertain: number
  exclude: number
  undecided: number
  total: number
}

export async function fetchQueueSummary(
  projectId: string,
  stage: ScreeningStage,
  reviewerId: string,
): Promise<QueueSummary> {
  // Must match fetchQueue's eligibility exactly — otherwise the progress
  // bar shows "all non-duplicate records" as the denominator for every
  // stage, including full_text, where the real denominator is only the
  // records that were INCLUDEd at title_abstract (usually a small subset).
  const relevantIds = await listEligibleRecordIds(projectId, stage)
  const total = relevantIds.size

  const { data: mine, error: mineError } = await supabase
    .from('screenings')
    .select('record_id, decision')
    .eq('reviewer_id', reviewerId)
    .eq('stage', stage)
  if (mineError) throw mineError

  let include = 0
  let uncertain = 0
  let exclude = 0
  for (const s of mine) {
    if (!relevantIds.has(s.record_id)) continue
    if (s.decision === 'INCLUDE') include++
    else if (s.decision === 'UNCERTAIN') uncertain++
    else if (s.decision === 'EXCLUDE') exclude++
  }
  const decided = include + uncertain + exclude
  return { include, uncertain, exclude, undecided: total - decided, total }
}
