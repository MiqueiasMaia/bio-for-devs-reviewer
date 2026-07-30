import type { ParsedRecord } from './types.js'

// Minimal shape of an OpenAlex Work object — only the fields the
// snowballing feature (api/snowball.ts) actually reads. OpenAlex returns
// much more (concepts, grants, sustainable development goals, ...) which
// is intentionally left out of this type and out of `raw` too, to keep
// the stored payload small.
export interface OpenAlexWork {
  id: string
  doi: string | null
  title: string | null
  display_name: string | null
  publication_year: number | null
  primary_location: { source: { display_name: string | null } | null } | null
  authorships: { author: { display_name: string } }[] | null
  abstract_inverted_index: Record<string, number[]> | null
  referenced_works: string[] | null
  ids: { pmid?: string | null } | null
}

/** OpenAlex doesn't return abstract text directly (publisher copyright
 * terms) — it returns a word -> [positions] inverted index instead. This
 * rebuilds the plain-text abstract from it. */
export function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string | null {
  if (!invertedIndex || Object.keys(invertedIndex).length === 0) return null
  const positioned: string[] = []
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) positioned[pos] = word
  }
  return positioned.filter((w) => w !== undefined).join(' ') || null
}

/** OpenAlex work IDs are full URLs (`https://openalex.org/W123`) — this is
 * the bare ID (`W123`) form the API's own endpoints and `filter=cites:`
 * expect. */
export function bareOpenAlexId(idUrl: string): string {
  return idUrl.replace(/^https?:\/\/openalex\.org\//, '')
}

/** Same shape/conventions as the RIS/CSV/NBIB parsers in this directory —
 * `sourceDb: 'snowballing'` is the only thing that marks these records as
 * citation-expansion candidates rather than a regular import, since
 * `records.source_db` is free-text with no fixed enum (see other parsers). */
export function parseOpenAlexWork(work: OpenAlexWork): ParsedRecord {
  return {
    title: work.title ?? work.display_name ?? '',
    authors: (work.authorships ?? []).map((a) => a.author.display_name).join('; '),
    abstract: reconstructAbstract(work.abstract_inverted_index),
    year: work.publication_year ?? null,
    doi: work.doi,
    pmid: work.ids?.pmid ? work.ids.pmid.replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//, '') : null,
    journal: work.primary_location?.source?.display_name ?? null,
    sourceDb: 'snowballing',
    raw: work as unknown as Record<string, unknown>,
  }
}
