import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ScreeningStage } from '@/types/domain'
import * as api from './api'

const conflictsKey = (projectId: string, stage: ScreeningStage) => ['conflicts', projectId, stage] as const

export function useConflicts(projectId: string, stage: ScreeningStage) {
  return useQuery({ queryKey: conflictsKey(projectId, stage), queryFn: () => api.listConflicts(projectId, stage) })
}

export function useResolveConflict(projectId: string, stage: ScreeningStage) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.resolveConflict,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conflictsKey(projectId, stage) })
      qc.invalidateQueries({ queryKey: ['prisma_counts', projectId] })
      qc.invalidateQueries({ queryKey: ['agreement', projectId] })
    },
  })
}
