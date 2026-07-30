import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createAdminClient } from './_lib/supabaseAdmin.js'

// Legally-open PDFs only — Unpaywall indexes preprints/repository copies/
// publisher OA, never paywalled content. This deliberately does NOT attempt
// to log in anywhere (CAFe/institutional SSO is an interactive federated
// login, not something an API key or env var can drive) — see the chat
// discussion: automating that would violate CAPES/publisher terms of use
// and risks the whole institution's access getting flagged. This is the
// safe subset of "fetch the PDF automatically."
const FETCH_TIMEOUT_MS = 10_000

interface UnpaywallResponse {
  is_oa: boolean
  best_oa_location: { url_for_pdf: string | null; url: string | null } | null
}

type UnpaywallFailureReason = 'not_found' | 'lookup_failed' | 'no_oa_pdf' | 'download_failed' | 'not_a_pdf'

function isValidBody(body: unknown): body is { projectId: string; recordId: string; doi: string } {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return typeof b.projectId === 'string' && typeof b.recordId === 'string' && typeof b.doi === 'string'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!isValidBody(req.body)) {
    res.status(400).json({ error: 'projectId, recordId and doi are required' })
    return
  }
  const { projectId, recordId, doi } = req.body

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

  const { data: membership } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!membership || (membership.role !== 'owner' && membership.role !== 'reviewer')) {
    res.status(403).json({ error: 'Not a member of this project with screening access' })
    return
  }

  const { data: record } = await admin
    .from('records')
    .select('id')
    .eq('id', recordId)
    .eq('project_id', projectId)
    .maybeSingle()
  if (!record) {
    res.status(404).json({ error: 'Record not found in this project' })
    return
  }

  const email = process.env.UNPAYWALL_EMAIL
  if (!email) {
    res.status(500).json({ error: 'UNPAYWALL_EMAIL is not configured on the server' })
    return
  }

  // Any terminal outcome below (found or not) marks the record as checked,
  // so the frontend's automatic lookup never fires twice for the same
  // record. A config error (missing env var, auth/membership failure)
  // returns earlier above and deliberately does NOT stamp this — those
  // aren't "we looked and found nothing", they're "we couldn't look".
  async function respond(body: { attached: boolean; reason?: UnpaywallFailureReason; storagePath?: string }) {
    await admin.from('records').update({ unpaywall_checked_at: new Date().toISOString() }).eq('id', recordId)
    res.status(200).json(body)
  }

  let unpaywall: UnpaywallResponse
  try {
    const lookupRes = await fetch(
      `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    )
    if (!lookupRes.ok) {
      await respond({ attached: false, reason: 'not_found' })
      return
    }
    unpaywall = (await lookupRes.json()) as UnpaywallResponse
  } catch {
    await respond({ attached: false, reason: 'lookup_failed' })
    return
  }

  const pdfUrl = unpaywall.best_oa_location?.url_for_pdf ?? unpaywall.best_oa_location?.url ?? null
  if (!unpaywall.is_oa || !pdfUrl) {
    await respond({ attached: false, reason: 'no_oa_pdf' })
    return
  }

  let pdfBuffer: Buffer
  try {
    const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!pdfRes.ok) {
      await respond({ attached: false, reason: 'download_failed' })
      return
    }
    pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
    const looksLikePdf =
      (pdfRes.headers.get('content-type') ?? '').includes('pdf') ||
      pdfBuffer.subarray(0, 4).toString('latin1') === '%PDF'
    if (!looksLikePdf) {
      await respond({ attached: false, reason: 'not_a_pdf' })
      return
    }
  } catch {
    await respond({ attached: false, reason: 'download_failed' })
    return
  }

  const storagePath = `${projectId}/${recordId}/${Date.now()}-unpaywall.pdf`
  const { error: uploadError } = await admin.storage
    .from('fulltext')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' })
  if (uploadError) {
    res.status(500).json({ error: 'Failed to store the retrieved PDF' })
    return
  }

  const { error: insertError } = await admin
    .from('fulltext_docs')
    .insert({ record_id: recordId, storage_path: storagePath, uploaded_by: userId })
  if (insertError) {
    res.status(500).json({ error: 'Failed to record the fetched PDF' })
    return
  }

  await respond({ attached: true, storagePath })
}
