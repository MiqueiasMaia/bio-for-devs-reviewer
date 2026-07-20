import { supabase } from '@/lib/supabase'
import type { ScreeningStage } from '@/types/domain'
import {
  buildConfusionMatrix,
  buildFleissMatrix,
  cohenKappa,
  fleissKappa,
  percentAgreement,
  type RatingEntry,
} from '@/domain/agreement/kappa'

const CATEGORIES = ['INCLUDE', 'UNCERTAIN', 'EXCLUDE']

export interface AgreementStats {
  method: 'cohen' | 'fleiss' | 'insufficient_data'
  raterCount: number
  itemCount: number
  kappa: number
  observedAgreement: number
  expectedAgreement: number
  percentAgreement: number
}

async function fetchScreeningEntries(projectId: string, stage: ScreeningStage): Promise<RatingEntry[]> {
  const { data, error } = await supabase
    .from('screenings')
    .select('record_id, reviewer_id, decision, records!inner(project_id)')
    .eq('records.project_id', projectId)
    .eq('stage', stage)
    .returns<{ record_id: string; reviewer_id: string; decision: string }[]>()
  if (error) throw error
  return data.map((s) => ({ itemId: s.record_id, raterId: s.reviewer_id, decision: s.decision }))
}

async function fetchAiEntries(projectId: string, stage: ScreeningStage): Promise<RatingEntry[]> {
  const { data, error } = await supabase
    .from('ai_screenings')
    .select('record_id, decision, records!inner(project_id)')
    .eq('records.project_id', projectId)
    .eq('stage', stage)
    .returns<{ record_id: string; decision: string }[]>()
  if (error) throw error
  return data.map((a) => ({ itemId: a.record_id, raterId: 'AI', decision: a.decision }))
}

/**
 * Computes inter-rater agreement for a project/stage: Cohen's kappa when
 * exactly two raters are involved, Fleiss' kappa otherwise (which is also
 * what kicks in when `includeAi` adds a third "rater" alongside two human
 * reviewers) — per spec §7, the AI can be treated as just another rater so
 * human-vs-AI agreement is measurable the same way.
 */
export async function computeAgreement(
  projectId: string,
  stage: ScreeningStage,
  includeAi: boolean,
): Promise<AgreementStats> {
  const entries = await fetchScreeningEntries(projectId, stage)
  const allEntries = includeAi ? [...entries, ...(await fetchAiEntries(projectId, stage))] : entries
  const raterIds = [...new Set(allEntries.map((e) => e.raterId))]

  if (raterIds.length < 2) {
    return {
      method: 'insufficient_data',
      raterCount: raterIds.length,
      itemCount: 0,
      kappa: NaN,
      observedAgreement: NaN,
      expectedAgreement: NaN,
      percentAgreement: NaN,
    }
  }

  if (raterIds.length === 2) {
    const [raterA, raterB] = raterIds
    const byItem = new Map<string, Partial<Record<string, string>>>()
    for (const e of allEntries) {
      const row = byItem.get(e.itemId) ?? {}
      row[e.raterId] = e.decision
      byItem.set(e.itemId, row)
    }
    const paired = [...byItem.values()].filter((row) => row[raterA] && row[raterB])
    const ratingsA = paired.map((row) => row[raterA]!)
    const ratingsB = paired.map((row) => row[raterB]!)
    const result = cohenKappa(ratingsA, ratingsB, CATEGORIES)
    const { matrix } = buildConfusionMatrix(ratingsA, ratingsB, CATEGORIES)
    return {
      method: 'cohen',
      raterCount: 2,
      itemCount: paired.length,
      ...result,
      percentAgreement: percentAgreement(matrix),
    }
  }

  const { matrix, itemIds } = buildFleissMatrix(allEntries, CATEGORIES)
  const result = fleissKappa(matrix)
  return {
    method: 'fleiss',
    raterCount: raterIds.length,
    itemCount: itemIds.length,
    ...result,
    percentAgreement: percentAgreement(matrix),
  }
}

export function interpretKappa(kappa: number): string {
  if (Number.isNaN(kappa)) return ''
  if (kappa < 0) return 'interpretation_poor'
  if (kappa <= 0.2) return 'interpretation_fair'
  if (kappa <= 0.4) return 'interpretation_moderate'
  if (kappa <= 0.6) return 'interpretation_moderate'
  if (kappa <= 0.8) return 'interpretation_substantial'
  return 'interpretation_almost_perfect'
}
