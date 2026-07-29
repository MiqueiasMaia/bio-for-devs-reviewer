import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ScreeningStage } from '@/types/domain'
import { runAiScreening } from '@/features/aiScreening/api'
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

/** Re-runs the AI screening for a single record that's already been
 * screened — the backend upserts on (record_id, stage, model_name), so
 * this simply overwrites the previous decision/rationale/criteria. */
export function useRerunAiScreening(projectId: string, stage: ScreeningStage) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recordId: string) => {
      const [result] = await runAiScreening(projectId, [recordId], stage)
      if (result?.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai_screened_records', projectId, stage] })
      qc.invalidateQueries({ queryKey: ['ai_screening_stats', projectId, stage] })
      qc.invalidateQueries({ queryKey: ['ai_human_divergences', projectId, stage] })
      qc.invalidateQueries({ queryKey: ['agreement', projectId] })
    },
  })
}
