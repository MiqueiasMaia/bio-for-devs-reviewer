import { useQuery } from '@tanstack/react-query'
import type { ScreeningStage } from '@/types/domain'
import * as api from './api'

export function useAiScreenedRecords(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['ai_screened_records', projectId, stage],
    queryFn: () => api.listAiScreenedRecords(projectId, stage),
  })
}

export function useAiScreeningStats(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['ai_screening_stats', projectId, stage],
    queryFn: () => api.fetchAiScreeningStats(projectId, stage),
  })
}

export function useAiHumanDivergences(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['ai_human_divergences', projectId, stage],
    queryFn: () => api.listAiHumanDivergences(projectId, stage),
  })
}
