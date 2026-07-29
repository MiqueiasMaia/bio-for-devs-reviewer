import { jaroWinklerSimilarity } from './jaroWinkler'
import { normalizeDoi, normalizeTitle } from './normalize'

export interface AutoResolveCriteria {
  doi: boolean
  title: boolean
  year: boolean
  authors: boolean
  journal: boolean
  /** In [0, 1], or null when the similarity criterion is disabled. */
  titleSimilarityThreshold: number | null
}

export interface AutoResolveRecord {
  id: string
  doi: string | null
  title: string
  authors: string
  year: number | null
  journal: string | null
}

function allEqual<T>(values: T[]): boolean {
  return values.every((v) => v === values[0])
}

/**
 * Whether every member of a duplicate group agrees closely enough to let
 * the Auto Resolver confirm the group's existing primary without a human
 * looking at it — every criterion the reviewer turned on must hold across
 * ALL members (not just adjacent pairs), mirroring Rayyan's "all selected
 * criteria must match" rule. A single-member group is trivially resolvable
 * (there's nothing left to compare).
 */
export function isGroupAutoResolvable(records: AutoResolveRecord[], criteria: AutoResolveCriteria): boolean {
  if (records.length < 2) return true

  if (criteria.doi) {
    const normalized = records.map((r) => normalizeDoi(r.doi))
    if (normalized.some((d) => d === null) || !allEqual(normalized)) return false
  }

  if (criteria.title) {
    if (!allEqual(records.map((r) => normalizeTitle(r.title)))) return false
  }

  if (criteria.year) {
    if (records.some((r) => r.year === null) || !allEqual(records.map((r) => r.year))) return false
  }

  if (criteria.authors) {
    if (!allEqual(records.map((r) => normalizeTitle(r.authors)))) return false
  }

  if (criteria.journal) {
    if (!allEqual(records.map((r) => normalizeTitle(r.journal ?? '')))) return false
  }

  if (criteria.titleSimilarityThreshold !== null) {
    const normalizedTitles = records.map((r) => normalizeTitle(r.title))
    for (let i = 0; i < normalizedTitles.length; i++) {
      for (let j = i + 1; j < normalizedTitles.length; j++) {
        if (jaroWinklerSimilarity(normalizedTitles[i], normalizedTitles[j]) < criteria.titleSimilarityThreshold) {
          return false
        }
      }
    }
  }

  return true
}
