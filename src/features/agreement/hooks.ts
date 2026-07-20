import { useQuery } from '@tanstack/react-query'
import type { ScreeningStage } from '@/types/domain'
import { computeAgreement } from './api'

export function useAgreement(projectId: string, stage: ScreeningStage, includeAi: boolean) {
  return useQuery({
    queryKey: ['agreement', projectId, stage, includeAi],
    queryFn: () => computeAgreement(projectId, stage, includeAi),
  })
}
