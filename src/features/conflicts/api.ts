import { supabase } from '@/lib/supabase'
import type { Decision, ScreeningStage } from '@/types/domain'

export interface ConflictReviewerDecision {
  reviewerId: string
  reviewerName: string
  decision: Decision
  reasons: string[]
  notes: string
  decidedAt: string
}

export interface ConflictAiScreening {
  modelName: string
  decision: Decision
  rationale: string | null
  confidence: number | null
}

export interface ConflictSummary {
  recordId: string
  humanRef: string
  title: string
  authors: string
  year: number | null
  doi: string | null
  reviewerDecisions: ConflictReviewerDecision[]
  aiScreening: ConflictAiScreening | null
}

export async function listConflicts(projectId: string, stage: ScreeningStage): Promise<ConflictSummary[]> {
  const { data: conflicts, error: conflictsError } = await supabase
    .from('v_conflicts')
    .select('record_id')
    .eq('project_id', projectId)
    .eq('stage', stage)
  if (conflictsError) throw conflictsError
  if (conflicts.length === 0) return []

  const recordIds = conflicts.map((c) => c.record_id)

  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('id, human_ref, title, authors, year, doi')
    .in('id', recordIds)
  if (recordsError) throw recordsError

  const { data: screenings, error: screeningsError } = await supabase
    .from('screenings')
    .select('record_id, reviewer_id, decision, reasons, notes, decided_at')
    .in('record_id', recordIds)
    .eq('stage', stage)
  if (screeningsError) throw screeningsError

  const { data: aiScreenings, error: aiError } = await supabase
    .from('ai_screenings')
    .select('record_id, model_name, decision, rationale, confidence')
    .in('record_id', recordIds)
    .eq('stage', stage)
  if (aiError) throw aiError

  const reviewerIds = [...new Set(screenings.map((s) => s.reviewer_id))]
  const { data: profiles, error: profilesError } =
    reviewerIds.length === 0
      ? { data: [], error: null }
      : await supabase.from('profiles').select('id, display_name').in('id', reviewerIds)
  if (profilesError) throw profilesError
  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]))

  const recordById = new Map(records.map((r) => [r.id, r]))
  const screeningsByRecord = new Map<string, ConflictReviewerDecision[]>()
  for (const s of screenings) {
    const list = screeningsByRecord.get(s.record_id) ?? []
    list.push({
      reviewerId: s.reviewer_id,
      reviewerName: nameById.get(s.reviewer_id) ?? '—',
      decision: s.decision,
      reasons: s.reasons,
      notes: s.notes,
      decidedAt: s.decided_at,
    })
    screeningsByRecord.set(s.record_id, list)
  }
  const aiByRecord = new Map(aiScreenings.map((a) => [a.record_id, a]))

  return recordIds
    .map((id) => recordById.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => {
      const ai = aiByRecord.get(r.id)
      return {
        recordId: r.id,
        humanRef: r.human_ref,
        title: r.title,
        authors: r.authors,
        year: r.year,
        doi: r.doi,
        reviewerDecisions: screeningsByRecord.get(r.id) ?? [],
        aiScreening: ai
          ? { modelName: ai.model_name, decision: ai.decision, rationale: ai.rationale, confidence: ai.confidence }
          : null,
      }
    })
}

export async function resolveConflict(input: {
  recordId: string
  stage: ScreeningStage
  resolvedDecision: Decision
  resolvedBy: string
  rationale: string
}): Promise<void> {
  const { error } = await supabase.from('resolutions').upsert(
    {
      record_id: input.recordId,
      stage: input.stage,
      resolved_decision: input.resolvedDecision,
      resolved_by: input.resolvedBy,
      rationale: input.rationale,
      resolved_at: new Date().toISOString(),
    },
    { onConflict: 'record_id,stage' },
  )
  if (error) throw error
}
