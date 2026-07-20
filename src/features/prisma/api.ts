import { supabase } from '@/lib/supabase'

export interface PrismaCounts {
  recordsIdentified: number
  duplicatesRemoved: number
  recordsScreenedTa: number
  excludedTa: number
  fulltextSought: number
  fulltextAssessed: number
  excludedFulltext: number
  includedFinal: number
}

export async function fetchPrismaCounts(projectId: string): Promise<PrismaCounts> {
  const { data, error } = await supabase
    .from('v_prisma_counts')
    .select('*')
    .eq('project_id', projectId)
    .single()
  if (error) throw error
  return {
    recordsIdentified: data.records_identified,
    duplicatesRemoved: data.duplicates_removed,
    recordsScreenedTa: data.records_screened_ta,
    excludedTa: data.excluded_ta,
    fulltextSought: data.fulltext_sought,
    fulltextAssessed: data.fulltext_assessed,
    excludedFulltext: data.excluded_fulltext,
    includedFinal: data.included_final,
  }
}

export interface ExclusionReasonCount {
  reasonCode: string
  count: number
}

export async function fetchFulltextExclusionReasons(projectId: string): Promise<ExclusionReasonCount[]> {
  const { data, error } = await supabase
    .from('v_fulltext_exclusion_reasons')
    .select('reason_code, count')
    .eq('project_id', projectId)
  if (error) throw error
  return data.map((r) => ({ reasonCode: r.reason_code, count: r.count }))
}
