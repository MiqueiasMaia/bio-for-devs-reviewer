import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createAdminClient } from './_lib/supabaseAdmin.js'
import { findMostSevereNotice, isAtLeastAsSevere, type CrossrefUpdateEntry } from '../src/domain/retractionWatch/crossref.js'
import { normalizeDoi } from '../src/domain/dedup/normalize.js'

// Continuous retraction watch (docs/pending-items.md §7.3). Two ways in:
//
// 1. Vercel Cron (see the `crons` entry in vercel.json) hits this route
//    with GET and Vercel's own `Authorization: Bearer $CRON_SECRET` header
//    (Vercel sets this automatically whenever CRON_SECRET is configured on
//    the project) — runs across every project, oldest-checked-first, so
//    the watch keeps working on reviews nobody is actively looking at.
// 2. A project owner/reviewer's "Verificar agora" button (POST, normal
//    session bearer token + membership check) — runs scoped to just their
//    project, for an on-demand refresh instead of waiting for the next
//    cron tick.
//
// Both paths share the same batch logic below; only how the candidate
// pool is scoped and how many records are processed differs.
const FETCH_TIMEOUT_MS = 8_000
const CONCURRENCY = 3
const GLOBAL_BATCH_LIMIT = 100
const DEFAULT_USER_BATCH_LIMIT = 20
const MAX_USER_BATCH_LIMIT = 50

interface CrossrefWorkResponse {
  message?: { 'update-to'?: CrossrefUpdateEntry[] }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

type AdminClient = ReturnType<typeof createAdminClient>

/** Bounded, scalable candidate selection: pulls a staleness-ordered pool of
 * DOI-bearing records first (cheap, indexed by retraction_checked_at), then
 * narrows that small pool to the ones that are actually INCLUDEd — instead
 * of listing every INCLUDEd record project-wide (or globally) up front,
 * which for a big project/global run risks the same ".in() with hundreds
 * of ids" URL-length problem noted elsewhere in this codebase. */
async function fetchCandidateRecords(admin: AdminClient, opts: { projectId?: string; limit: number }) {
  let poolQuery = admin
    .from('records')
    .select('id, project_id, doi, retraction_status')
    .not('doi', 'is', null)
    .order('retraction_checked_at', { ascending: true, nullsFirst: true })
    .limit(opts.limit * 5)
  if (opts.projectId) poolQuery = poolQuery.eq('project_id', opts.projectId)
  const { data: pool, error: poolError } = await poolQuery
  if (poolError) throw poolError
  if (!pool || pool.length === 0) return []

  const { data: finals, error: finalsError } = await admin
    .from('v_record_final_decision')
    .select('record_id')
    .eq('final_decision', 'INCLUDE')
    .in('stage', ['title_abstract', 'full_text'])
    .in(
      'record_id',
      pool.map((p) => p.id),
    )
  if (finalsError) throw finalsError
  const includedIds = new Set((finals ?? []).map((f) => f.record_id))

  return pool.filter((p) => includedIds.has(p.id)).slice(0, opts.limit)
}

async function checkOneRecord(
  admin: AdminClient,
  record: { id: string; doi: string | null; retraction_status: string | null },
  email: string,
): Promise<{ checked: boolean; flagged: boolean }> {
  const doi = normalizeDoi(record.doi)
  const nowIso = new Date().toISOString()
  if (!doi) {
    await admin.from('records').update({ retraction_checked_at: nowIso }).eq('id', record.id)
    return { checked: true, flagged: false }
  }

  let body: CrossrefWorkResponse
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (res.status === 404) {
      // Crossref simply doesn't have this DOI — that's a real (if empty)
      // answer, not a failure, so it still counts as checked.
      await admin.from('records').update({ retraction_checked_at: nowIso }).eq('id', record.id)
      return { checked: true, flagged: false }
    }
    if (!res.ok) return { checked: false, flagged: false } // transient — retry next run
    body = (await res.json()) as CrossrefWorkResponse
  } catch {
    return { checked: false, flagged: false }
  }

  const finding = findMostSevereNotice(body.message?.['update-to'])
  const shouldEscalate = finding !== null && isAtLeastAsSevere(finding.status, record.retraction_status)
  await admin
    .from('records')
    .update({
      retraction_checked_at: nowIso,
      ...(shouldEscalate ? { retraction_status: finding.status, retraction_notice_doi: finding.noticeDoi } : {}),
    })
    .eq('id', record.id)
  return { checked: true, flagged: Boolean(finding) }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.authorization
  const isCronRequest = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`

  const admin = createAdminClient()
  const email = process.env.CROSSREF_EMAIL
  if (!email) {
    res.status(500).json({ error: 'CROSSREF_EMAIL is not configured on the server' })
    return
  }

  let candidates: Awaited<ReturnType<typeof fetchCandidateRecords>>

  if (isCronRequest) {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    candidates = await fetchCandidateRecords(admin, { limit: GLOBAL_BATCH_LIMIT })
  } else {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    const body = req.body as { projectId?: unknown; limit?: unknown }
    if (typeof body?.projectId !== 'string') {
      res.status(400).json({ error: 'projectId is required' })
      return
    }
    const projectId = body.projectId
    const limit = Math.min(Math.max(typeof body.limit === 'number' ? body.limit : DEFAULT_USER_BATCH_LIMIT, 1), MAX_USER_BATCH_LIMIT)

    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!accessToken) {
      res.status(401).json({ error: 'Missing Authorization bearer token' })
      return
    }
    const { data: userData, error: userError } = await admin.auth.getUser(accessToken)
    if (userError || !userData.user) {
      res.status(401).json({ error: 'Invalid session' })
      return
    }
    const { data: membership } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (!membership || (membership.role !== 'owner' && membership.role !== 'reviewer')) {
      res.status(403).json({ error: 'Not a member of this project with screening access' })
      return
    }

    candidates = await fetchCandidateRecords(admin, { projectId, limit })
  }

  if (candidates.length === 0) {
    res.status(200).json({ checked: 0, flagged: 0 })
    return
  }

  const results = await runWithConcurrency(candidates, CONCURRENCY, (record) => checkOneRecord(admin, record, email))
  const checked = results.filter((r) => r.checked).length
  const flagged = results.filter((r) => r.flagged).length
  res.status(200).json({ checked, flagged })
}
