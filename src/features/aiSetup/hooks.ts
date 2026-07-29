import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AiSetupResult } from '@/domain/aiSetup/schema'
import { importAiSetupResult, type AiSetupImportStartIndex } from './api'

export function useImportAiSetupResult(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { parsed: AiSetupResult; startIndex: AiSetupImportStartIndex }) =>
      importAiSetupResult(projectId, args.parsed, args.startIndex),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['criteria', projectId] })
      qc.invalidateQueries({ queryKey: ['highlight_terms', projectId] })
      qc.invalidateQueries({ queryKey: ['exclusion_reasons', projectId] })
    },
  })
}
