import { supabase } from '@/lib/supabase'
import type { AIProvider } from '@/types/domain'

export interface AiProviderConfig {
  provider: AIProvider
  model: string
  hasKey: boolean
  isActive: boolean
  updatedAt: string
}

/** Reads the safe status view (never the encrypted key itself) — RLS on
 * project_ai_providers already restricts this to the project owner. A
 * project can have a key saved for more than one provider at once (so
 * reviewers can switch without re-entering keys); only one is active. */
export async function listAiProviderConfigs(projectId: string): Promise<AiProviderConfig[]> {
  const { data, error } = await supabase
    .from('v_project_ai_config')
    .select('provider, model, has_key, is_active, updated_at')
    .eq('project_id', projectId)
  if (error) throw error
  return data.map((d) => ({
    provider: d.provider,
    model: d.model,
    hasKey: d.has_key,
    isActive: d.is_active,
    updatedAt: d.updated_at,
  }))
}

async function authorizedFetch(path: string, method: 'POST' | 'DELETE', body: unknown): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('No active session')

  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new Error(errorBody.error ?? `Request failed with status ${res.status}`)
  }
}

/**
 * The plaintext key only ever passes through /api/project-ai-config,
 * which encrypts it (pgp_sym_encrypt) before persisting — this client
 * function never touches Supabase directly for writes. Saving a brand-new
 * key always makes that provider the active one; omitting apiKey on an
 * already-configured provider just updates its model (doesn't activate).
 */
export async function saveAiProviderConfig(input: {
  projectId: string
  provider: AIProvider
  model: string
  apiKey?: string
}): Promise<void> {
  await authorizedFetch('/api/project-ai-config', 'POST', input)
}

/** Switches which already-configured provider is active — no key or model
 * touched. This is the actual "trocar de provedor sem reconfigurar" flow. */
export async function activateAiProviderConfig(projectId: string, provider: AIProvider): Promise<void> {
  await authorizedFetch('/api/project-ai-config', 'POST', { projectId, provider, activateOnly: true })
}

export async function deleteAiProviderConfig(projectId: string, provider: AIProvider): Promise<void> {
  await authorizedFetch('/api/project-ai-config', 'DELETE', { projectId, provider })
}

export interface ProviderUsageSummary {
  provider: AIProvider
  model: string
  callCount: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  hasMissingPricing: boolean
}

export async function fetchUsageSummary(projectId: string): Promise<ProviderUsageSummary[]> {
  const { data, error } = await supabase
    .from('ai_usage_log')
    .select('provider, model, input_tokens, output_tokens, estimated_cost')
    .eq('project_id', projectId)
  if (error) throw error

  const byKey = new Map<string, ProviderUsageSummary>()
  for (const row of data) {
    const key = `${row.provider}:${row.model}`
    const existing = byKey.get(key) ?? {
      provider: row.provider,
      model: row.model,
      callCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      hasMissingPricing: false,
    }
    existing.callCount += 1
    existing.totalInputTokens += row.input_tokens
    existing.totalOutputTokens += row.output_tokens
    if (row.estimated_cost === null) existing.hasMissingPricing = true
    else existing.totalCost += row.estimated_cost
    byKey.set(key, existing)
  }
  return [...byKey.values()]
}
