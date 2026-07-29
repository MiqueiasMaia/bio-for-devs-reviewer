import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AIProvider } from '@/types/domain'
import * as api from './api'

const configKey = (projectId: string) => ['ai_provider_config', projectId] as const
const usageKey = (projectId: string) => ['ai_usage_summary', projectId] as const

export function useAiProviderConfigs(projectId: string) {
  return useQuery({ queryKey: configKey(projectId), queryFn: () => api.listAiProviderConfigs(projectId) })
}

export function useSaveAiProviderConfig(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { provider: AIProvider; model: string; apiKey?: string }) =>
      api.saveAiProviderConfig({ projectId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: configKey(projectId) }),
  })
}

export function useActivateAiProviderConfig(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (provider: AIProvider) => api.activateAiProviderConfig(projectId, provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: configKey(projectId) }),
  })
}

export function useDeleteAiProviderConfig(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (provider: AIProvider) => api.deleteAiProviderConfig(projectId, provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: configKey(projectId) }),
  })
}

export function useAiUsageSummary(projectId: string) {
  return useQuery({ queryKey: usageKey(projectId), queryFn: () => api.fetchUsageSummary(projectId) })
}
