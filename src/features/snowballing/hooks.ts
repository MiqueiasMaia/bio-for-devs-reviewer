import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runSnowballExpansion } from './api'

export function useRunSnowballing(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (limit: number) => runSnowballExpansion(projectId, limit),
    onSuccess: (result) => {
      if (result.added === 0) return
      // New records land at title_abstract, unscreened — every view that
      // counts/lists records for this project needs to see them. Partial
      // keys (no stage/reviewerId) invalidate every matching query
      // regardless of who's viewing which stage right now.
      qc.invalidateQueries({ queryKey: ['prisma_counts', projectId] })
      qc.invalidateQueries({ queryKey: ['screening_queue', projectId] })
      qc.invalidateQueries({ queryKey: ['screening_summary', projectId] })
      qc.invalidateQueries({ queryKey: ['dedup_summary', projectId] })
    },
  })
}
