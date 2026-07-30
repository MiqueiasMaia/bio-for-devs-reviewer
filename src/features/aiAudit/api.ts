import { supabase } from '@/lib/supabase'
import type { AiCriterionDetail, Decision, ScreeningStage } from '@/types/domain'

export interface AiScreenedRecord {
  id: string
  humanRef: string
  title: string
  authors: string
  year: number | null
  decision: Decision
  confidence: number | null
  rationale: string | null
  criteriaDetail: AiCriterionDetail[]
  modelName: string
  rescreenCount: number
}

interface AiScreeningQueryRow {
  record_id: string
  decision: Decision
  confidence: number | null
  rationale: string | null
  criteria_detail: AiCriterionDetail[]
  model_name: string
  rescreen_count: number
  records: { project_id: string; human_ref: string; title: string; authors: string; year: number | null }
}

/** Every record the AI has screened for this project/stage — not the
 * "included" set (that's what Risk of Bias/Extraction use); this is about
 * the AI's own screening process, regardless of final consensus. */
export async function listAiScreenedRecords(projectId: string, stage: ScreeningStage): Promise<AiScreenedRecord[]> {
  const { data, error } = await supabase
    .from('ai_screenings')
    .select(
      'record_id, decision, confidence, rationale, criteria_detail, model_name, rescreen_count, records!inner(project_id, human_ref, title, authors, year)',
    )
    .eq('stage', stage)
    .eq('records.project_id', projectId)
    .returns<AiScreeningQueryRow[]>()
  if (error) throw error
  return data
    .map((r) => ({
      id: r.record_id,
      humanRef: r.records.human_ref,
      title: r.records.title,
      authors: r.records.authors,
      year: r.records.year,
      decision: r.decision,
      confidence: r.confidence,
      rationale: r.rationale,
      criteriaDetail: r.criteria_detail,
      modelName: r.model_name,
      rescreenCount: r.rescreen_count,
    }))
    .sort((a, b) => a.humanRef.localeCompare(b.humanRef))
}

export interface AiStageStats {
  decision: Decision
  count: number
}

export async function fetchAiScreeningStats(projectId: string, stage: ScreeningStage): Promise<AiStageStats[]> {
  const { data, error } = await supabase
    .from('v_ai_screening_stats')
    .select('decision, count')
    .eq('project_id', projectId)
    .eq('stage', stage)
  if (error) throw error
  return data
}

export interface AiHumanDivergence {
  recordId: string
  humanRef: string
  title: string
  aiDecision: Decision
  humanDecisions: { reviewerName: string; decision: Decision }[]
}

/** Records where the AI's decision differs from at least one human
 * decision on the same record/stage — a plain client-side comparison,
 * same spirit as ConflictsPage.tsx's query, but not filtered through
 * v_conflicts (that view is about human-consensus conflicts, a different
 * category from "the AI disagreed with someone"). */
export async function listAiHumanDivergences(projectId: string, stage: ScreeningStage): Promise<AiHumanDivergence[]> {
  const { data: aiRows, error: aiError } = await supabase
    .from('ai_screenings')
    .select('record_id, decision, records!inner(project_id, human_ref, title)')
    .eq('stage', stage)
    .eq('records.project_id', projectId)
    .returns<{ record_id: string; decision: Decision; records: { project_id: string; human_ref: string; title: string } }[]>()
  if (aiError) throw aiError
  if (aiRows.length === 0) return []

  const recordIds = aiRows.map((r) => r.record_id)
  const { data: humanRows, error: humanError } = await supabase
    .from('screenings')
    .select('record_id, reviewer_id, decision')
    .in('record_id', recordIds)
    .eq('stage', stage)
  if (humanError) throw humanError

  const reviewerIds = [...new Set(humanRows.map((h) => h.reviewer_id))]
  const { data: profiles, error: profilesError } =
    reviewerIds.length === 0
      ? { data: [], error: null }
      : await supabase.from('profiles').select('id, display_name').in('id', reviewerIds)
  if (profilesError) throw profilesError
  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]))

  const humanByRecord = new Map<string, { reviewer_id: string; decision: Decision }[]>()
  for (const h of humanRows) {
    const list = humanByRecord.get(h.record_id) ?? []
    list.push(h)
    humanByRecord.set(h.record_id, list)
  }

  const divergences: AiHumanDivergence[] = []
  for (const a of aiRows) {
    const humans = humanByRecord.get(a.record_id) ?? []
    if (!humans.some((h) => h.decision !== a.decision)) continue
    divergences.push({
      recordId: a.record_id,
      humanRef: a.records.human_ref,
      title: a.records.title,
      aiDecision: a.decision,
      humanDecisions: humans.map((h) => ({ reviewerName: nameById.get(h.reviewer_id) ?? '—', decision: h.decision })),
    })
  }
  return divergences
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/** Same CSV conventions (BOM + CRLF + quoted cells) as the rest of the
 * app's exports (screening/csvRoundTrip.ts, dataExtraction/api.ts). */
export function buildAiScreeningStatsCsv(stats: AiStageStats[]): string {
  const headers = ['decision', 'count']
  const rows = stats.map((s) => [s.decision, s.count])
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','))
  return '﻿' + lines.join('\r\n')
}
