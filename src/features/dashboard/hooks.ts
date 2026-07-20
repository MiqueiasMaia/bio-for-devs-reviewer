import { useQuery } from '@tanstack/react-query'
import type { ScreeningStage } from '@/types/domain'
import { countOpenConflicts, fetchThroughput } from './api'

export function useThroughput(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['throughput', projectId, stage],
    queryFn: () => fetchThroughput(projectId, stage),
  })
}

export function useOpenConflictCount(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['open_conflicts_count', projectId, stage],
    queryFn: () => countOpenConflicts(projectId, stage),
  })
}
