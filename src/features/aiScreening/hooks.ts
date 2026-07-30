import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ScreeningStage } from '@/types/domain'
import { fetchLastAiRunAt, fetchRescreenRoundInfo, listRecordIdsToScreen, listUnscreenedRecordIds, runAiScreening } from './api'

export function useUnscreenedCount(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['ai_unscreened', projectId, stage],
    queryFn: () => listUnscreenedRecordIds(projectId, stage, 500),
    select: (ids) => ids.length,
  })
}

export function useRescreenRoundInfo(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['ai_rescreen_round_info', projectId, stage],
    queryFn: () => fetchRescreenRoundInfo(projectId, stage),
  })
}

export function useLastAiRunAt(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['ai_last_run_at', projectId, stage],
    queryFn: () => fetchLastAiRunAt(projectId, stage),
  })
}

export function useRunAiScreening(projectId: string, stage: ScreeningStage) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ limit, includeAlreadyScreened }: { limit: number; includeAlreadyScreened: boolean }) => {
      const ids = await listRecordIdsToScreen(projectId, stage, limit, includeAlreadyScreened)
      if (ids.length === 0) return []
      return runAiScreening(projectId, ids, stage)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai_unscreened', projectId, stage] })
      qc.invalidateQueries({ queryKey: ['ai_screened_records', projectId, stage] })
      qc.invalidateQueries({ queryKey: ['ai_screening_stats', projectId, stage] })
      qc.invalidateQueries({ queryKey: ['ai_human_divergences', projectId, stage] })
      qc.invalidateQueries({ queryKey: ['agreement', projectId] })
      qc.invalidateQueries({ queryKey: ['ai_rescreen_round_info', projectId, stage] })
      qc.invalidateQueries({ queryKey: ['ai_last_run_at', projectId, stage] })
    },
  })
}
