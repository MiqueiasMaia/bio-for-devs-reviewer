import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsQueryKey } from '@/features/projects/hooks'
import type { AutoResolveCriteria } from '@/domain/dedup/autoResolve'
import * as api from './api'
import { runImportPipeline, type RunImportInput } from './importPipeline'

const dedupGroupsKey = (projectId: string) => ['dedup_groups', projectId] as const
const recordsKey = (projectId: string) => ['records', projectId] as const

export function useRunImport(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<RunImportInput, 'projectId'>) =>
      runImportPipeline({ ...input, projectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recordsKey(projectId) })
      qc.invalidateQueries({ queryKey: dedupGroupsKey(projectId) })
      qc.invalidateQueries({ queryKey: ['dedup_summary', projectId] })
      qc.invalidateQueries({ queryKey: projectsQueryKey })
    },
  })
}

export function useDedupGroups(projectId: string) {
  return useQuery({ queryKey: dedupGroupsKey(projectId), queryFn: () => api.listDedupGroups(projectId) })
}

export function useDedupSummary(projectId: string) {
  return useQuery({
    queryKey: ['dedup_summary', projectId],
    queryFn: () => api.fetchDedupSummary(projectId),
  })
}

export function useDedupMutations(projectId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: dedupGroupsKey(projectId) })
    qc.invalidateQueries({ queryKey: recordsKey(projectId) })
    qc.invalidateQueries({ queryKey: ['dedup_summary', projectId] })
    qc.invalidateQueries({ queryKey: projectsQueryKey })
  }
  return {
    markNotDuplicate: useMutation({
      mutationFn: (recordIds: string[]) => api.markGroupAsNotDuplicate(projectId, recordIds),
      onSuccess: invalidate,
    }),
    setPrimary: useMutation({
      mutationFn: (args: { groupId: string; recordIds: string[]; primaryId: string }) =>
        api.setDedupPrimary(args.groupId, args.recordIds, args.primaryId),
      onSuccess: invalidate,
    }),
  }
}

export function useAutoResolveDedup(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (criteria: AutoResolveCriteria) => api.autoResolveDedupGroups(projectId, criteria),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dedupGroupsKey(projectId) })
      qc.invalidateQueries({ queryKey: recordsKey(projectId) })
      qc.invalidateQueries({ queryKey: ['dedup_summary', projectId] })
      qc.invalidateQueries({ queryKey: projectsQueryKey })
    },
  })
}
