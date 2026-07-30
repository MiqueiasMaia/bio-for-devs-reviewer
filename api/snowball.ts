import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createAdminClient } from './_lib/supabaseAdmin.js'
import { bareOpenAlexId, parseOpenAlexWork, type OpenAlexWork } from '../src/domain/import/openAlex.js'
import { normalizeDoi } from '../src/domain/dedup/normalize.js'

// Citation-based expansion (snowballing): for each already-INCLUDEd record
// with a DOI, asks OpenAlex (free, no key required — just a `mailto` for
// the "polite pool") for the works it cites and the works that cite it,
// and inserts whichever of those aren't already in the project as new
// pending `records`, tagged `source_db: 'snowballing'`, so they flow into
// the normal title/abstract queue like any other imported record.
//
// Every cap below is deliberately conservative: this fetches per-work-id
// (no bulk OpenAlex filter — safer to get right than to guess at
// multi-id filter syntax) so the call count is `seeds * (1 + 1 +
// referenced)`, and Vercel functions have a real wall-clock budget. A
// project with more INCLUDEd records than `MAX_SEED_RECORDS` just needs
// this endpoint hit again — `snowball_expanded_at` (migration 0029) means
// each seed is only ever queried once, so re-running always makes
// progress on whatever wasn't covered yet, never repeats work.
const FETCH_TIMEOUT_MS = 8_000
const CONCURRENCY = 3
const MAX_SEED_RECORDS = 20
const DEFAULT_SEED_RECORDS = 5
const MAX_REFERENCED_PER_SEED = 8
const MAX_CITING_PER_SEED = 8

interface OpenAlexListResponse {
  results: OpenAlexWork[]
}

function isValidBody(body: unknown): body is { projectId: string; limit?: number } {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return typeof b.projectId === 'string' && (b.limit === undefined || typeof b.limit === 'number')
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!isValidBody(req.body)) {
    res.status(400).json({ error: 'projectId is required' })
    return
  }
  const { projectId } = req.body
  const seedLimit = Math.min(Math.max(req.body.limit ?? DEFAULT_SEED_RECORDS, 1), MAX_SEED_RECORDS)

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

  const email = process.env.OPENALEX_EMAIL
  if (!email) {
    res.status(500).json({ error: 'OPENALEX_EMAIL is not configured on the server' })
    return
  }
  const mailto = `mailto=${encodeURIComponent(email)}`

  // "Already INCLUDEd" = INCLUDE at title_abstract, OR INCLUDE at
  // full_text (which covers the UNCERTAIN-at-title_abstract case) — same
  // definition used by listExtractionEligibleRecords in
  // src/features/dataExtraction/api.ts.
  const { data: finals, error: finalsError } = await admin
    .from('v_record_final_decision')
    .select('record_id')
    .eq('project_id', projectId)
    .eq('final_decision', 'INCLUDE')
    .in('stage', ['title_abstract', 'full_text'])
  if (finalsError) {
    res.status(500).json({ error: finalsError.message })
    return
  }
  const includedIds = [...new Set((finals ?? []).map((f) => f.record_id))]
  if (includedIds.length === 0) {
    res.status(200).json({ seedsProcessed: 0, added: 0 })
    return
  }

  const { data: seeds, error: seedsError } = await admin
    .from('records')
    .select('id, doi')
    .in('id', includedIds)
    .not('doi', 'is', null)
    .is('snowball_expanded_at', null)
    .order('created_at', { ascending: true })
    .limit(seedLimit)
  if (seedsError) {
    res.status(500).json({ error: seedsError.message })
    return
  }
  if (!seeds || seeds.length === 0) {
    res.status(200).json({ seedsProcessed: 0, added: 0 })
    return
  }

  const { data: existingRecords, error: existingError } = await admin
    .from('records')
    .select('doi')
    .eq('project_id', projectId)
    .not('doi', 'is', null)
  if (existingError) {
    res.status(500).json({ error: existingError.message })
    return
  }
  const knownDois = new Set(
    (existingRecords ?? []).map((r) => normalizeDoi(r.doi)).filter((d): d is string => d !== null),
  )

  async function fetchWork(url: string): Promise<OpenAlexWork | null> {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      if (!r.ok) return null
      return (await r.json()) as OpenAlexWork
    } catch {
      return null
    }
  }

  const candidatesByDoi = new Map<string, OpenAlexWork>()
  const expandedSeedIds: string[] = []

  await runWithConcurrency(seeds, CONCURRENCY, async (seed) => {
    const doi = normalizeDoi(seed.doi)
    if (!doi) return
    const work = await fetchWork(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?${mailto}`)
    if (!work) return // OpenAlex has no record for this DOI — leave unmarked, worth retrying later

    expandedSeedIds.push(seed.id)

    const referencedIds = (work.referenced_works ?? []).slice(0, MAX_REFERENCED_PER_SEED).map(bareOpenAlexId)
    const referencedWorks = await runWithConcurrency(referencedIds, CONCURRENCY, (id) =>
      fetchWork(`https://api.openalex.org/works/${id}?${mailto}`),
    )

    const ownId = bareOpenAlexId(work.id)
    const citingRes = await (async () => {
      try {
        const r = await fetch(
          `https://api.openalex.org/works?filter=cites:${ownId}&per-page=${MAX_CITING_PER_SEED}&${mailto}`,
          { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
        )
        if (!r.ok) return null
        return (await r.json()) as OpenAlexListResponse
      } catch {
        return null
      }
    })()

    for (const candidate of [...referencedWorks, ...(citingRes?.results ?? [])]) {
      if (!candidate) continue
      const candidateDoi = normalizeDoi(candidate.doi)
      if (!candidateDoi || knownDois.has(candidateDoi)) continue
      knownDois.add(candidateDoi)
      candidatesByDoi.set(candidateDoi, candidate)
    }
  })

  const newRecords = [...candidatesByDoi.values()].map(parseOpenAlexWork)
  if (newRecords.length > 0) {
    const { error: insertError } = await admin.from('records').insert(
      newRecords.map((r) => ({
        project_id: projectId,
        import_id: null,
        doi: r.doi,
        pmid: r.pmid,
        title: r.title,
        authors: r.authors,
        abstract: r.abstract,
        year: r.year,
        journal: r.journal,
        source_db: r.sourceDb,
        raw: r.raw,
      })),
    )
    if (insertError) {
      res.status(500).json({ error: insertError.message })
      return
    }
  }

  if (expandedSeedIds.length > 0) {
    await admin
      .from('records')
      .update({ snowball_expanded_at: new Date().toISOString() })
      .in('id', expandedSeedIds)
  }

  res.status(200).json({ seedsProcessed: expandedSeedIds.length, added: newRecords.length })
}
