import { supabase } from '@/lib/supabase'
import type { ScreeningStage } from '@/types/domain'

export interface ReviewerThroughput {
  reviewerId: string
  reviewerName: string
  count: number
}

export async function fetchThroughput(projectId: string, stage: ScreeningStage): Promise<ReviewerThroughput[]> {
  const { data, error } = await supabase
    .from('screenings')
    .select('reviewer_id, records!inner(project_id)')
    .eq('records.project_id', projectId)
    .eq('stage', stage)
    .returns<{ reviewer_id: string }[]>()
  if (error) throw error

  const countByReviewer = new Map<string, number>()
  for (const row of data) countByReviewer.set(row.reviewer_id, (countByReviewer.get(row.reviewer_id) ?? 0) + 1)

  const reviewerIds = [...countByReviewer.keys()]
  const { data: profiles, error: profilesError } =
    reviewerIds.length === 0
      ? { data: [], error: null }
      : await supabase.from('profiles').select('id, display_name').in('id', reviewerIds)
  if (profilesError) throw profilesError
  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]))

  return reviewerIds
    .map((id) => ({ reviewerId: id, reviewerName: nameById.get(id) ?? '—', count: countByReviewer.get(id)! }))
    .sort((a, b) => b.count - a.count)
}

export async function countOpenConflicts(projectId: string, stage: ScreeningStage): Promise<number> {
  const { count, error } = await supabase
    .from('v_conflicts')
    .select('record_id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('stage', stage)
  if (error) throw error
  return count ?? 0
}
