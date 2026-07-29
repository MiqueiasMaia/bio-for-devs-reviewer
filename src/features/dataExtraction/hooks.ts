import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

const eligibleKey = (projectId: string) => ['extraction_eligible_records', projectId] as const
const extractionKey = (recordId: string, extractorId: string) =>
  ['data_extraction', recordId, extractorId] as const
const statusKey = (projectId: string, extractorId: string) => ['extraction_status', projectId, extractorId] as const
const fieldStatusKey = (projectId: string) => ['extraction_field_status', projectId] as const
const conflictsKey = (projectId: string) => ['extraction_conflicts', projectId] as const

export function useExtractionEligibleRecords(projectId: string) {
  return useQuery({ queryKey: eligibleKey(projectId), queryFn: () => api.listExtractionEligibleRecords(projectId) })
}

export function useExtractionStatus(projectId: string, extractorId: string) {
  return useQuery({
    queryKey: statusKey(projectId, extractorId),
    queryFn: () => api.listExtractionStatus(projectId, extractorId),
  })
}

export function useExtraction(recordId: string, extractorId: string) {
  return useQuery({
    queryKey: extractionKey(recordId, extractorId),
    queryFn: () => api.getExtraction(recordId, extractorId),
    enabled: Boolean(recordId),
  })
}

export function useSaveExtraction(projectId: string, recordId: string, extractorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { answers: Record<string, string | string[]>; notes: string }) =>
      api.saveExtraction({ recordId, extractorId, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: extractionKey(recordId, extractorId) })
      qc.invalidateQueries({ queryKey: statusKey(projectId, extractorId) })
      qc.invalidateQueries({ queryKey: fieldStatusKey(projectId) })
      qc.invalidateQueries({ queryKey: conflictsKey(projectId) })
    },
  })
}

export function useExtractionFieldStatus(projectId: string) {
  return useQuery({ queryKey: fieldStatusKey(projectId), queryFn: () => api.listFieldStatus(projectId) })
}

export function useExtractionConflicts(projectId: string) {
  return useQuery({ queryKey: conflictsKey(projectId), queryFn: () => api.listExtractionConflicts(projectId) })
}

export function useResolveExtractionField(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      recordId: string
      fieldKey: string
      resolvedValue: string | string[]
      resolvedBy: string
      rationale: string
    }) => api.resolveExtractionField(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fieldStatusKey(projectId) })
      qc.invalidateQueries({ queryKey: conflictsKey(projectId) })
    },
  })
}
