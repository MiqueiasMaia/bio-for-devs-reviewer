/**
 * Interprets Crossref's `update-to` field — the list of notices Crossref
 * has linked to a DOI (corrections, retractions, expressions of concern,
 * ...) — to answer "should this included study be flagged for the
 * reviewer?" Pure parsing/priority logic, no network — see
 * docs/pending-items.md §7.3. The actual Crossref lookup lives in
 * api/check-retractions.ts (server-only, needs CROSSREF_EMAIL).
 */

export interface CrossrefUpdateEntry {
  DOI: string
  type: string
  label?: string
  updated?: { 'date-parts'?: number[][] }
}

export interface RetractionFinding {
  /** The Crossref update `type` that triggered the flag, e.g. "retraction". */
  status: string
  noticeDoi: string
  /** ISO date (YYYY-MM-DD) if Crossref provided one, else null. */
  noticeDate: string | null
}

/** Ordered most-to-least severe — only these types flag a study; a plain
 * "correction"/"erratum"/"addendum" is common, minor, and not what a
 * reviewer needs interrupted for. When Crossref lists more than one
 * qualifying notice (rare), the most severe wins. */
const FLAGGED_TYPES = ['retraction', 'partial_retraction', 'expression_of_concern', 'withdrawal', 'removal']

function datePartsToIso(parts: number[] | undefined): string | null {
  if (!parts || parts.length === 0) return null
  const [year, month = 1, day = 1] = parts
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function findMostSevereNotice(updates: CrossrefUpdateEntry[] | undefined | null): RetractionFinding | null {
  if (!updates || updates.length === 0) return null
  const flagged = updates.filter((u) => FLAGGED_TYPES.includes(u.type))
  if (flagged.length === 0) return null
  const best = [...flagged].sort((a, b) => FLAGGED_TYPES.indexOf(a.type) - FLAGGED_TYPES.indexOf(b.type))[0]
  return { status: best.type, noticeDoi: best.DOI, noticeDate: datePartsToIso(best.updated?.['date-parts']?.[0]) }
}

/** A record's stored flag only ever moves towards more severe, never back
 * — a check that (for whatever transient reason) doesn't see a notice
 * Crossref reported before must not erase that history. `current: null`
 * (never flagged) is always upgradable; an unrecognized stored value never
 * blocks an update. */
export function isAtLeastAsSevere(candidate: string, current: string | null): boolean {
  if (!current) return true
  const candidateIndex = FLAGGED_TYPES.indexOf(candidate)
  const currentIndex = FLAGGED_TYPES.indexOf(current)
  if (candidateIndex === -1) return false
  if (currentIndex === -1) return true
  return candidateIndex <= currentIndex
}
