import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ScreeningStage } from '@/types/domain'
import { listUnscreenedRecordIds, runAiScreening } from './api'

export function useUnscreenedCount(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['ai_unscreened', projectId, stage],
    queryFn: () => listUnscreenedRecordIds(projectId, stage, 500),
    select: (ids) => ids.length,
  })
}

export function useRunAiScreening(projectId: string, stage: ScreeningStage) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (limit: number) => {
      const ids = await listUnscreenedRecordIds(projectId, stage, limit)
      if (ids.length === 0) return []
      return runAiScreening(projectId, ids, stage)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai_unscreened', projectId, stage] })
      qc.invalidateQueries({ queryKey: ['agreement', projectId] })
    },
  })
}
