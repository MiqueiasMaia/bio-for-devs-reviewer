import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AIProvider } from '../src/types/domain.js'
import { createAdminClient } from './_lib/supabaseAdmin.js'

const VALID_PROVIDERS: AIProvider[] = ['google', 'groq', 'openrouter', 'anthropic']

interface PostBody {
  projectId: string
  provider: AIProvider
  model: string
  apiKey?: string
}

function isValidPostBody(body: unknown): body is PostBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.projectId === 'string' &&
    typeof b.provider === 'string' &&
    (VALID_PROVIDERS as string[]).includes(b.provider) &&
    typeof b.model === 'string' &&
    b.model.length > 0 &&
    (b.apiKey === undefined || typeof b.apiKey === 'string')
  )
}

interface DeleteBody {
  projectId: string
}

function isValidDeleteBody(body: unknown): body is DeleteBody {
  if (!body || typeof body !== 'object') return false
  return typeof (body as Record<string, unknown>).projectId === 'string'
}

/**
 * The only place a project's AI provider API key touches the server in
 * plaintext — it's encrypted (pgp_sym_encrypt, via the set_project_ai_key
 * SQL function) before ever being persisted. Owner-only, stricter than the
 * usual owner/reviewer gate used for screening-related endpoints, matching
 * project_ai_providers' RLS.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const authHeader = req.headers.authorization
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!accessToken) {
    res.status(401).json({ error: 'Missing Authorization bearer token' })
    return
  }

  const admin = createAdminClient()

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken)
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Invalid session' })
    return
  }
  const userId = userData.user.id

  const secret = process.env.AI_KEY_ENCRYPTION_SECRET
  if (!secret) {
    res.status(500).json({ error: 'AI_KEY_ENCRYPTION_SECRET is not configured on the server' })
    return
  }

  if (req.method === 'DELETE') {
    if (!isValidDeleteBody(req.body)) {
      res.status(400).json({ error: 'projectId is required' })
      return
    }
    const { projectId } = req.body

    const { data: membership } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!membership || membership.role !== 'owner') {
      res.status(403).json({ error: 'Only the project owner can manage the AI provider configuration' })
      return
    }

    const { error } = await admin.rpc('delete_project_ai_key', { p_project_id: projectId })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ ok: true })
    return
  }

  if (!isValidPostBody(req.body)) {
    res.status(400).json({ error: 'projectId, provider and model are required' })
    return
  }
  const { projectId, provider, model, apiKey } = req.body

  const { data: membership } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!membership || membership.role !== 'owner') {
    res.status(403).json({ error: 'Only the project owner can manage the AI provider configuration' })
    return
  }

  if (apiKey) {
    const { error } = await admin.rpc('set_project_ai_key', {
      p_project_id: projectId,
      p_provider: provider,
      p_model: model,
      p_api_key: apiKey,
      p_secret: secret,
    })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ ok: true })
    return
  }

  // No new key provided — this must be "change the model, keep the
  // existing key" on an already-configured project, not initial setup.
  const { data: existing } = await admin
    .from('project_ai_providers')
    .select('project_id')
    .eq('project_id', projectId)
    .maybeSingle()
  if (!existing) {
    res.status(400).json({ error: 'An API key is required to configure a provider for the first time' })
    return
  }

  const { error } = await admin.rpc('set_project_ai_model', {
    p_project_id: projectId,
    p_provider: provider,
    p_model: model,
  })
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(200).json({ ok: true })
}
