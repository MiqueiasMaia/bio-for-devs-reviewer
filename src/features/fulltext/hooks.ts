import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

const docsKey = (recordId: string) => ['fulltext_docs', recordId] as const

export function useFulltextDocs(recordId: string) {
  return useQuery({ queryKey: docsKey(recordId), queryFn: () => api.listFulltextDocs(recordId) })
}

export function useFulltextMutations(recordId: string, projectId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: docsKey(recordId) })
  return {
    upload: useMutation({
      mutationFn: (args: { file: File; uploadedBy: string }) =>
        api.uploadFulltextPdf(projectId, recordId, args.file, args.uploadedBy),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (doc: api.FulltextDoc) => api.deleteFulltextDoc(doc.id, doc.storagePath),
      onSuccess: invalidate,
    }),
    fetchOpenAccess: useMutation({
      mutationFn: (doi: string) => api.fetchOpenAccessPdf(projectId, recordId, doi),
      onSuccess: (result) => {
        if (result.attached) invalidate()
      },
    }),
  }
}
