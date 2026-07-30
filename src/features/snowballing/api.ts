import { supabase } from '@/lib/supabase'

export interface SnowballResult {
  seedsProcessed: number
  added: number
}

/** Runs citation-based expansion (see /api/snowball) for up to `limit`
 * not-yet-expanded INCLUDEd records in this project. Server-side because
 * it fans out to several OpenAlex calls per seed record — not something
 * to run from the browser. */
export async function runSnowballExpansion(projectId: string, limit: number): Promise<SnowballResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('No active session')

  const res = await fetch('/api/snowball', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ projectId, limit }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed with status ${res.status}`)
  }
  return (await res.json()) as SnowballResult
}
