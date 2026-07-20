import type { Decision } from '@/types/domain'

export interface ParsedRecord {
  title: string
  authors: string
  abstract: string | null
  year: number | null
  doi: string | null
  pmid: string | null
  journal: string | null
  sourceDb: string | null
  /** Everything else from the source file, kept for traceability/debugging. */
  raw: Record<string, unknown>
  /**
   * Present only when the source (e.g. a legacy CSV export with an `ai`
   * column) already carries a pre-screening decision for this record.
   */
  aiDecision?: Decision
}
