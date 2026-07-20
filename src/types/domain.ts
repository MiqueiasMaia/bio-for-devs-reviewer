export type ProjectRole = 'owner' | 'reviewer' | 'viewer'

export type ScreeningStage = 'title_abstract' | 'full_text'

export type Decision = 'INCLUDE' | 'UNCERTAIN' | 'EXCLUDE'

export type ImportFormat = 'ris' | 'csv' | 'nbib'

export type PicotsDimension = 'P' | 'I' | 'C' | 'O' | 'T' | 'S'

export type CriterionKind = 'inclusion' | 'exclusion'

export interface ProjectDedupSettings {
  on_doi: boolean
  on_normalized_title: boolean
  title_similarity_threshold: number
}

export interface ProjectSettings {
  reviewers_required_per_record: number
  blind_screening: boolean
  auto_advance_on_decision: boolean
  stages_enabled: ScreeningStage[]
  dedup: ProjectDedupSettings
  ui_locale: string
  ai_screening_enabled: boolean
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  reviewers_required_per_record: 2,
  blind_screening: true,
  auto_advance_on_decision: true,
  stages_enabled: ['title_abstract', 'full_text'],
  dedup: { on_doi: true, on_normalized_title: true, title_similarity_threshold: 0.92 },
  ui_locale: 'pt-BR',
  ai_screening_enabled: false,
}
