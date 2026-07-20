import { jaroWinklerSimilarity } from './jaroWinkler'
import { normalizeDoi, normalizeTitle } from './normalize'
import { UnionFind } from './unionFind'

export interface DedupInputRecord {
  id: string
  doi: string | null
  title: string
  year: number | null
  abstract: string | null
}

export interface DedupOptions {
  onDoi: boolean
  onNormalizedTitle: boolean
  titleSimilarityThreshold: number
}

export interface DedupGroup {
  recordIds: string[]
  /** The record chosen to survive as dedup_primary; the rest are duplicates. */
  primaryId: string
}

function pickPrimaryId(records: DedupInputRecord[]): string {
  let best = records[0]
  let bestScore = -1
  for (const r of records) {
    const score = (r.doi ? 2 : 0) + (r.abstract ? 1 : 0)
    if (score > bestScore) {
      bestScore = score
      best = r
    }
  }
  return best.id
}

/**
 * Groups records into duplicate clusters: first by normalized DOI, then by
 * normalized-title similarity (Jaro-Winkler ≥ threshold). Only clusters with
 * more than one member are returned — these are candidates for the dedup
 * review screen, not yet auto-applied.
 *
 * Title comparison is bucketed by publication year to keep the pairwise
 * comparison count tractable on larger imports (duplicates virtually always
 * share a year across source databases); records missing a year are
 * compared against everything, since they're usually a small minority and
 * skipping them risks silently missing real duplicates.
 */
export function computeDedupGroups(
  records: DedupInputRecord[],
  options: DedupOptions,
): DedupGroup[] {
  const uf = new UnionFind(records.map((r) => r.id))

  if (options.onDoi) {
    const byDoi = new Map<string, string[]>()
    for (const r of records) {
      const norm = normalizeDoi(r.doi)
      if (!norm) continue
      const list = byDoi.get(norm) ?? []
      list.push(r.id)
      byDoi.set(norm, list)
    }
    for (const ids of byDoi.values()) {
      for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i])
    }
  }

  if (options.onNormalizedTitle) {
    const normalizedTitles = new Map(records.map((r) => [r.id, normalizeTitle(r.title)]))
    const byYear = new Map<number, DedupInputRecord[]>()
    const noYear: DedupInputRecord[] = []
    for (const r of records) {
      if (r.year === null) {
        noYear.push(r)
      } else {
        const list = byYear.get(r.year) ?? []
        list.push(r)
        byYear.set(r.year, list)
      }
    }

    const compare = (a: DedupInputRecord, b: DedupInputRecord) => {
      const ta = normalizedTitles.get(a.id)!
      const tb = normalizedTitles.get(b.id)!
      if (!ta || !tb) return
      if (jaroWinklerSimilarity(ta, tb) >= options.titleSimilarityThreshold) {
        uf.union(a.id, b.id)
      }
    }

    for (const group of byYear.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) compare(group[i], group[j])
        for (const nb of noYear) compare(group[i], nb)
      }
    }
    for (let i = 0; i < noYear.length; i++) {
      for (let j = i + 1; j < noYear.length; j++) compare(noYear[i], noYear[j])
    }
  }

  const clusters = new Map<string, string[]>()
  for (const r of records) {
    const root = uf.find(r.id)
    const list = clusters.get(root) ?? []
    list.push(r.id)
    clusters.set(root, list)
  }

  const byId = new Map(records.map((r) => [r.id, r]))
  return [...clusters.values()]
    .filter((ids) => ids.length > 1)
    .map((recordIds) => ({
      recordIds,
      primaryId: pickPrimaryId(recordIds.map((id) => byId.get(id)!)),
    }))
}
