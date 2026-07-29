import { supabase } from '@/lib/supabase'
import type { RobAnswer, RobDomain, RobJudgment } from '@/types/domain'

export interface RobEligibleRecord {
  id: string
  humanRef: string
  title: string
  authors: string
  year: number | null
  doi: string | null
}

/** Records that count toward the review's final included set (full-text
 * INCLUDE) — the same set PRISMA reports as `includedFinal`. RoB has no
 * consensus logic of its own in this first pass; eligibility just reuses
 * the screening consensus already computed by v_record_final_decision. */
export async function listRobEligibleRecords(projectId: string): Promise<RobEligibleRecord[]> {
  const { data: finals, error: finalsError } = await supabase
    .from('v_record_final_decision')
    .select('record_id')
    .eq('project_id', projectId)
    .eq('stage', 'full_text')
    .eq('final_decision', 'INCLUDE')
  if (finalsError) throw finalsError
  const recordIds = finals.map((f) => f.record_id)
  if (recordIds.length === 0) return []

  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('id, human_ref, title, authors, year, doi')
    .in('id', recordIds)
    .order('human_ref', { ascending: true })
  if (recordsError) throw recordsError
  return records.map((r) => ({
    id: r.id,
    humanRef: r.human_ref,
    title: r.title,
    authors: r.authors,
    year: r.year,
    doi: r.doi,
  }))
}

export interface RobAssessmentRow {
  domain: RobDomain
  answers: Record<string, RobAnswer>
  riskJudgment: RobJudgment | null
  applicabilityJudgment: RobJudgment | null
  justification: string
}

export async function listRobAssessments(
  recordId: string,
  assessorId: string,
): Promise<Map<RobDomain, RobAssessmentRow>> {
  const { data, error } = await supabase
    .from('risk_of_bias_assessments')
    .select('domain, answers, risk_judgment, applicability_judgment, justification')
    .eq('record_id', recordId)
    .eq('assessor_id', assessorId)
    .eq('tool', 'probast')
  if (error) throw error
  return new Map(
    data.map((row) => [
      row.domain as RobDomain,
      {
        domain: row.domain as RobDomain,
        answers: (row.answers ?? {}) as Record<string, RobAnswer>,
        riskJudgment: row.risk_judgment as RobJudgment | null,
        applicabilityJudgment: row.applicability_judgment as RobJudgment | null,
        justification: row.justification,
      },
    ]),
  )
}

/** Per-record "has this assessor finished the overall summary" map, for the
 * pending/done badge in the record list — one query for the whole list
 * instead of one per record. */
export async function listRobOverallStatus(projectId: string, assessorId: string): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from('risk_of_bias_assessments')
    .select('record_id, risk_judgment, records!inner(project_id)')
    .eq('assessor_id', assessorId)
    .eq('tool', 'probast')
    .eq('domain', 'overall')
    .eq('records.project_id', projectId)
    .returns<{ record_id: string; risk_judgment: string | null }[]>()
  if (error) throw error
  return new Map(data.map((r) => [r.record_id, r.risk_judgment !== null]))
}

export async function saveRobAssessment(input: {
  recordId: string
  assessorId: string
  domain: RobDomain
  answers: Record<string, RobAnswer>
  riskJudgment: RobJudgment | null
  applicabilityJudgment: RobJudgment | null
  justification: string
}): Promise<void> {
  const { error } = await supabase.from('risk_of_bias_assessments').upsert(
    {
      record_id: input.recordId,
      assessor_id: input.assessorId,
      tool: 'probast',
      domain: input.domain,
      answers: input.answers,
      risk_judgment: input.riskJudgment,
      applicability_judgment: input.applicabilityJudgment,
      justification: input.justification,
    },
    { onConflict: 'record_id,assessor_id,tool,domain' },
  )
  if (error) throw error
}
