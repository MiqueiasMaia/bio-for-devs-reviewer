import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchScoringStatus, runRerank } from './api'

const statusKey = (projectId: string) => ['active_learning_status', projectId] as const

export function useScoringStatus(projectId: string) {
  return useQuery({ queryKey: statusKey(projectId), queryFn: () => fetchScoringStatus(projectId) })
}

export function useRunRerank(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => runRerank(projectId),
    onSuccess: (outcome) => {
      if (outcome.status !== 'trained') return
      qc.invalidateQueries({ queryKey: statusKey(projectId) })
      // Relevance scores feed the queue's ordering (screening/api.ts
      // fetchQueue) — reflect a fresh (re)training immediately rather than
      // waiting for the queue's own staleness window.
      qc.invalidateQueries({ queryKey: ['screening_queue', projectId] })
    },
  })
}
