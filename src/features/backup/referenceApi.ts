import { supabase } from '@/lib/supabase'
import type { ScreeningStage } from '@/types/domain'
import type { ReferenceRecord } from '@/domain/referenceExport/referenceExport'

/**
 * "Included" means final_decision = INCLUDE at the last enabled stage
 * (full_text when the project uses it, otherwise title_abstract).
 */
export async function fetchIncludedRecords(
  projectId: string,
  finalStage: ScreeningStage,
): Promise<ReferenceRecord[]> {
  const { data: decisions, error: decisionsError } = await supabase
    .from('v_record_final_decision')
    .select('record_id')
    .eq('project_id', projectId)
    .eq('stage', finalStage)
    .eq('final_decision', 'INCLUDE')
  if (decisionsError) throw decisionsError
  if (decisions.length === 0) return []

  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('human_ref, title, authors, year, journal, doi')
    .in(
      'id',
      decisions.map((d) => d.record_id),
    )
  if (recordsError) throw recordsError

  return records.map((r) => ({
    humanRef: r.human_ref,
    title: r.title,
    authors: r.authors,
    year: r.year,
    journal: r.journal,
    doi: r.doi,
  }))
}
