import type {
  CriterionKind,
  Decision,
  PicotsDimension,
  ProjectSettings,
  ScreeningStage,
} from '@/types/domain'

/**
 * Full-project portable backup format (spec §8). Restoring creates a brand
 * new project owned by whoever imports it; record/screening/resolution ids
 * are preserved so relationships stay intact without remapping. Reviewer
 * identities (reviewer_id / resolved_by / uploaded_by) are preserved as-is,
 * which round-trips correctly when importing back into the same Supabase
 * auth instance (the common "clone/restore a project" case); importing into
 * a different Supabase project requires those user ids to already exist
 * there, or the affected rows are skipped — surfaced to the user rather
 * than silently dropped.
 */
export const BACKUP_SCHEMA_VERSION = 1

export interface BackupCriterion {
  kind: CriterionKind
  text: string
  orderIndex: number
  picotsDimension: PicotsDimension | null
}

export interface BackupHighlightTerm {
  category: string
  terms: string[]
  color: string
  orderIndex: number
}

export interface BackupExclusionReason {
  code: string
  label: string
  orderIndex: number
}

export interface BackupRecord {
  id: string
  humanRef: string
  doi: string | null
  pmid: string | null
  scopusEid: string | null
  title: string
  authors: string
  abstract: string | null
  year: number | null
  journal: string | null
  sourceDb: string | null
  dedupGroupId: string | null
  isDuplicate: boolean
  dedupPrimary: boolean
  raw: Record<string, unknown>
}

export interface BackupScreening {
  recordId: string
  reviewerId: string
  stage: ScreeningStage
  decision: Decision
  reasons: string[]
  notes: string
  decidedAt: string
}

export interface BackupResolution {
  recordId: string
  stage: ScreeningStage
  resolvedDecision: Decision
  resolvedBy: string
  rationale: string
  resolvedAt: string
}

export interface BackupAiScreening {
  recordId: string
  modelName: string
  decision: Decision
  rationale: string | null
  confidence: number | null
  stage: ScreeningStage
}

export interface ProjectBackup {
  schemaVersion: number
  exportedAt: string
  project: {
    name: string
    description: string
    prosperoId: string | null
    settings: ProjectSettings
  }
  criteria: BackupCriterion[]
  highlightTerms: BackupHighlightTerm[]
  exclusionReasons: BackupExclusionReason[]
  records: BackupRecord[]
  screenings: BackupScreening[]
  resolutions: BackupResolution[]
  aiScreenings: BackupAiScreening[]
}

export function isValidProjectBackup(value: unknown): value is ProjectBackup {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.schemaVersion === 'number' &&
    typeof v.project === 'object' &&
    v.project !== null &&
    Array.isArray(v.criteria) &&
    Array.isArray(v.highlightTerms) &&
    Array.isArray(v.exclusionReasons) &&
    Array.isArray(v.records) &&
    Array.isArray(v.screenings) &&
    Array.isArray(v.resolutions) &&
    Array.isArray(v.aiScreenings)
  )
}
