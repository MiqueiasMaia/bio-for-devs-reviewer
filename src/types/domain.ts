export type ProjectRole = 'owner' | 'reviewer' | 'viewer'

export type ScreeningStage = 'title_abstract' | 'full_text'

export type StageKey = 'title_abstract' | 'full_text' | 'conflicts' | 'risk_of_bias' | 'data_extraction'

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
  ai_counts_as_reviewer: boolean
  risk_of_bias_enabled: boolean
  data_extraction_enabled: boolean
  unlocked_stages: StageKey[]
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  reviewers_required_per_record: 2,
  blind_screening: true,
  auto_advance_on_decision: true,
  stages_enabled: ['title_abstract', 'full_text'],
  dedup: { on_doi: true, on_normalized_title: true, title_similarity_threshold: 0.92 },
  ui_locale: 'pt-BR',
  ai_screening_enabled: false,
  ai_counts_as_reviewer: false,
  risk_of_bias_enabled: false,
  data_extraction_enabled: false,
  unlocked_stages: ['title_abstract'],
}

export type RobDomain = 'participants' | 'predictors' | 'outcome' | 'analysis' | 'overall'

export type RobAnswer = 'yes' | 'probably_yes' | 'probably_no' | 'no' | 'no_information'

export type RobJudgment = 'low' | 'high' | 'unclear'

export type ExtractionFieldType = 'text' | 'number' | 'single_choice' | 'multi_choice'

export type AIProvider = 'google' | 'groq' | 'openrouter' | 'anthropic'

export interface AiCriterionDetail {
  criterion: string
  kind: CriterionKind
  met: boolean
  note: string
}
