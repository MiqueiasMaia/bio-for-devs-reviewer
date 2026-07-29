import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RobAnswer, RobDomain, RobJudgment } from '@/types/domain'
import * as api from './api'

const eligibleKey = (projectId: string) => ['rob_eligible_records', projectId] as const
const assessmentsKey = (recordId: string, assessorId: string) => ['rob_assessments', recordId, assessorId] as const
const overallStatusKey = (projectId: string, assessorId: string) => ['rob_overall_status', projectId, assessorId] as const

export function useRobEligibleRecords(projectId: string) {
  return useQuery({ queryKey: eligibleKey(projectId), queryFn: () => api.listRobEligibleRecords(projectId) })
}

export function useRobOverallStatus(projectId: string, assessorId: string) {
  return useQuery({
    queryKey: overallStatusKey(projectId, assessorId),
    queryFn: () => api.listRobOverallStatus(projectId, assessorId),
  })
}

export function useRobAssessments(recordId: string, assessorId: string) {
  return useQuery({
    queryKey: assessmentsKey(recordId, assessorId),
    queryFn: () => api.listRobAssessments(recordId, assessorId),
    enabled: Boolean(recordId),
  })
}

export function useSaveRobAssessment(projectId: string, recordId: string, assessorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      domain: RobDomain
      answers: Record<string, RobAnswer>
      riskJudgment: RobJudgment | null
      applicabilityJudgment: RobJudgment | null
      justification: string
    }) => api.saveRobAssessment({ ...input, recordId, assessorId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assessmentsKey(recordId, assessorId) })
      qc.invalidateQueries({ queryKey: overallStatusKey(projectId, assessorId) })
    },
  })
}
