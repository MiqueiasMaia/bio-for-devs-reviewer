import { useQuery } from '@tanstack/react-query'
import type { ScreeningStage } from '@/types/domain'
import { countOpenConflicts, fetchReviewerProgress } from './api'

export function useOpenConflictCount(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['open_conflicts_count', projectId, stage],
    queryFn: () => countOpenConflicts(projectId, stage),
  })
}

export function useReviewerProgress(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['reviewer_progress', projectId, stage],
    queryFn: () => fetchReviewerProgress(projectId, stage),
  })
}
