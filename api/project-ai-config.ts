import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AIProvider } from '../src/types/domain.js'
import { createAdminClient } from './_lib/supabaseAdmin.js'

const VALID_PROVIDERS: AIProvider[] = ['google', 'groq', 'openrouter', 'anthropic']

interface PostBody {
  projectId: string
  provider: AIProvider
  model?: string
  apiKey?: string
  /** Switch which already-configured provider is active, without touching
   * any key or model — the actual "trocar de provedor sem reconfigurar"
   * feature. */
  activateOnly?: boolean
}

function isValidProvider(value: unknown): value is AIProvider {
  return typeof value === 'string' && (VALID_PROVIDERS as string[]).includes(value)
}

function isValidPostBody(body: unknown): body is PostBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (typeof b.projectId !== 'string' || !isValidProvider(b.provider)) return false
  if (b.activateOnly === true) return true
  return (
    typeof b.model === 'string' &&
    b.model.length > 0 &&
    (b.apiKey === undefined || typeof b.apiKey === 'string')
  )
}

interface DeleteBody {
  projectId: string
  provider: AIProvider
}

function isValidDeleteBody(body: unknown): body is DeleteBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return typeof b.projectId === 'string' && isValidProvider(b.provider)
}

/**
 * The only place a project's AI provider API keys touch the server in
 * plaintext — encrypted (pgp_sym_encrypt, via set_project_ai_key) before
 * ever being persisted. Owner-only, stricter than the usual owner/reviewer
 * gate used for screening-related endpoints, matching
 * project_ai_providers' RLS. A project can have several providers saved
 * (one row each, unique per (project, provider)) but only one active at a
 * time — that's what api/ai-screen.ts actually uses.
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
      res.status(400).json({ error: 'projectId and provider are required' })
      return
    }
    const { projectId, provider } = req.body

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

    const { error } = await admin.rpc('delete_project_ai_key', { p_project_id: projectId, p_provider: provider })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ ok: true })
    return
  }

  if (!isValidPostBody(req.body)) {
    res.status(400).json({ error: 'projectId and provider are required (plus model, unless activateOnly)' })
    return
  }
  const { projectId, provider } = req.body

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

  if (req.body.activateOnly) {
    const { data: existing } = await admin
      .from('project_ai_providers')
      .select('project_id')
      .eq('project_id', projectId)
      .eq('provider', provider)
      .maybeSingle()
    if (!existing) {
      res.status(400).json({ error: 'Configure uma chave para este provedor antes de ativá-lo' })
      return
    }

    const { error } = await admin.rpc('set_active_ai_provider', { p_project_id: projectId, p_provider: provider })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ ok: true })
    return
  }

  const { model, apiKey } = req.body
  if (!model) {
    res.status(400).json({ error: 'model is required' })
    return
  }

  if (apiKey) {
    // A brand-new key always activates its provider — the reviewer just
    // configured it, so of course they want to use it now.
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
  // existing key" on an already-configured provider, not initial setup.
  // Deliberately doesn't touch is_active — editing a saved-but-inactive
  // provider's model shouldn't silently switch to it.
  const { data: existing } = await admin
    .from('project_ai_providers')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('provider', provider)
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
