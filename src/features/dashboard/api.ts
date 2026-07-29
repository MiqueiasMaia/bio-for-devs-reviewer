import { supabase } from '@/lib/supabase'
import type { ScreeningStage } from '@/types/domain'

export async function countOpenConflicts(projectId: string, stage: ScreeningStage): Promise<number> {
  const { count, error } = await supabase
    .from('v_conflicts')
    .select('record_id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('stage', stage)
  if (error) throw error
  return count ?? 0
}

export interface ReviewerProgress {
  reviewerId: string
  reviewerName: string
  /** Decisions made by this reviewer at this stage — the numerator. The
   * denominator (total eligible records) is the same for every reviewer at
   * a given stage, so callers get it from `usePrismaCounts` instead of
   * duplicating eligibility logic here. */
  decisionsMade: number
}

/** Unlike fetchThroughput, this always returns every owner/reviewer on the
 * project — including ones with 0 decisions so far — so "produtividade por
 * revisor" doesn't silently omit whoever hasn't started yet. */
export async function fetchReviewerProgress(projectId: string, stage: ScreeningStage): Promise<ReviewerProgress[]> {
  const { data: members, error: membersError } = await supabase
    .from('project_members')
    .select('user_id, role, profile:profiles(display_name)')
    .eq('project_id', projectId)
    .in('role', ['owner', 'reviewer'])
    .returns<{ user_id: string; role: string; profile: { display_name: string } | null }[]>()
  if (membersError) throw membersError

  const { data: screenings, error: screeningsError } = await supabase
    .from('screenings')
    .select('reviewer_id, records!inner(project_id)')
    .eq('records.project_id', projectId)
    .eq('stage', stage)
    .returns<{ reviewer_id: string }[]>()
  if (screeningsError) throw screeningsError

  const countByReviewer = new Map<string, number>()
  for (const row of screenings) countByReviewer.set(row.reviewer_id, (countByReviewer.get(row.reviewer_id) ?? 0) + 1)

  return members
    .map((m) => ({
      reviewerId: m.user_id,
      reviewerName: m.profile?.display_name ?? '—',
      decisionsMade: countByReviewer.get(m.user_id) ?? 0,
    }))
    .sort((a, b) => b.decisionsMade - a.decisionsMade)
}
