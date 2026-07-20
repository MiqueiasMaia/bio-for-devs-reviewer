import { useQuery } from '@tanstack/react-query'
import { fetchFulltextExclusionReasons, fetchPrismaCounts } from './api'

export function usePrismaCounts(projectId: string) {
  return useQuery({ queryKey: ['prisma_counts', projectId], queryFn: () => fetchPrismaCounts(projectId) })
}

export function useFulltextExclusionReasons(projectId: string) {
  return useQuery({
    queryKey: ['prisma_fulltext_reasons', projectId],
    queryFn: () => fetchFulltextExclusionReasons(projectId),
  })
}
