import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { getApplicableStages, lockStage, unlockStage } from '@/domain/stageLock/stageLock'
import type { StageKey } from '@/types/domain'
import * as api from './api'
import type { ProjectDetail } from './api'

export const projectsQueryKey = ['projects'] as const
export const projectQueryKey = (projectId: string) => ['projects', projectId] as const

export function useProjects(archived = false) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...projectsQueryKey, archived],
    queryFn: () => api.listMyProjects(user!.id, { archived }),
    enabled: Boolean(user),
  })
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectQueryKey(projectId ?? ''),
    queryFn: () => api.getProject(projectId!),
    enabled: Boolean(projectId),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  })
}

export function useArchiveProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => api.archiveProject(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) })
    },
  })
}

export function useUnarchiveProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => api.unarchiveProject(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => api.deleteProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  })
}

export function useUpdateProjectSettings(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.updateProjectSettings>[1]) =>
      api.updateProjectSettings(projectId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) })
      queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
  })
}

/**
 * Unlocks/locks a workflow stage (título/resumo -> texto completo ->
 * conflitos -> risco de viés -> extração de dados). Reads from the
 * server-fresh `project` passed at call time rather than any locally
 * drafted settings, so it can't clobber unrelated unsaved edits elsewhere
 * (e.g. a pending Settings form draft).
 */
export function useUnlockStage(projectId: string) {
  const update = useUpdateProjectSettings(projectId)
  return {
    ...update,
    unlock: (project: ProjectDetail, stage: StageKey) => {
      const applicable = getApplicableStages(project.settings)
      const next = unlockStage(stage, project.settings.unlocked_stages, applicable)
      if (next !== project.settings.unlocked_stages) {
        update.mutate({ settings: { ...project.settings, unlocked_stages: next } })
      }
    },
    lock: (project: ProjectDetail, stage: StageKey) => {
      const applicable = getApplicableStages(project.settings)
      update.mutate({
        settings: { ...project.settings, unlocked_stages: lockStage(stage, project.settings.unlocked_stages, applicable) },
      })
    },
  }
}
