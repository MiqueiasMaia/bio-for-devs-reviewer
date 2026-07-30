import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRetractionSummary, runRetractionCheck } from './api'

const summaryKey = (projectId: string) => ['retraction_summary', projectId] as const

export function useRetractionSummary(projectId: string) {
  return useQuery({ queryKey: summaryKey(projectId), queryFn: () => fetchRetractionSummary(projectId) })
}

export function useRunRetractionCheck(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (limit: number) => runRetractionCheck(projectId, limit),
    onSuccess: () => qc.invalidateQueries({ queryKey: summaryKey(projectId) }),
  })
}
