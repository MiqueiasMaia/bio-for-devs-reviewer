// Hand-written to mirror supabase/migrations/*.sql. If you have the Supabase
// CLI installed, `supabase gen types typescript --local > src/lib/database.types.ts`
// regenerates this file from the live schema — keep the shape compatible if
// you do (Database['public']['Tables'][...]['Row'/'Insert'/'Update']).
import type {
  AiCriterionDetail,
  AIProvider,
  CriterionKind,
  Decision,
  ExtractionFieldType,
  ImportFormat,
  PicotsDimension,
  ProjectRole,
  ProjectSettings,
  RobAnswer,
  RobDomain,
  RobJudgment,
  ScreeningStage,
} from '../types/domain.js'

// The `Relationships` array is required by supabase-js's GenericTable/
// GenericView constraint (used to type foreign-table embeds like
// `.select('*, project_members(role)')`). We don't rely on that embed-type
// inference — queries that embed a related table use `.returns<T>()`
// instead — so every table/view simply declares an empty array here.
type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }
type View<Row> = { Row: Row; Relationships: [] }

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string
          email: string
          display_name: string
          initials: string
          created_at: string
          updated_at: string
        },
        { id: string; email: string; display_name?: string; initials?: string },
        { display_name?: string; initials?: string }
      >
      projects: Table<
        {
          id: string
          name: string
          description: string
          owner_id: string
          prospero_id: string | null
          settings: ProjectSettings
          created_by: string
          created_at: string
          updated_at: string
          archived_at: string | null
          dedup_not_duplicate_count: number
        },
        {
          id?: string
          name: string
          description?: string
          owner_id: string
          prospero_id?: string | null
          settings?: ProjectSettings
          created_by: string
          archived_at?: string | null
          dedup_not_duplicate_count?: number
        },
        {
          name?: string
          description?: string
          prospero_id?: string | null
          settings?: ProjectSettings
          archived_at?: string | null
          dedup_not_duplicate_count?: number
        }
      >
      project_members: Table<
        { id: string; project_id: string; user_id: string; role: ProjectRole; created_at: string },
        { id?: string; project_id: string; user_id: string; role: ProjectRole },
        { role?: ProjectRole }
      >
      project_invites: Table<
        {
          id: string
          project_id: string
          email: string
          role: ProjectRole
          invited_by: string
          created_at: string
        },
        { id?: string; project_id: string; email: string; role: ProjectRole; invited_by: string },
        { role?: ProjectRole }
      >
      criteria: Table<
        {
          id: string
          project_id: string
          kind: CriterionKind
          text: string
          order_index: number
          picots_dimension: PicotsDimension | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          project_id: string
          kind: CriterionKind
          text: string
          order_index?: number
          picots_dimension?: PicotsDimension | null
        },
        {
          kind?: CriterionKind
          text?: string
          order_index?: number
          picots_dimension?: PicotsDimension | null
        }
      >
      highlight_terms: Table<
        {
          id: string
          project_id: string
          category: string
          terms: string[]
          color: string
          order_index: number
          created_at: string
          updated_at: string
        },
        {
          id?: string
          project_id: string
          category: string
          terms?: string[]
          color?: string
          order_index?: number
        },
        { category?: string; terms?: string[]; color?: string; order_index?: number }
      >
      exclusion_reasons: Table<
        {
          id: string
          project_id: string
          code: string
          label: string
          order_index: number
          created_at: string
          updated_at: string
        },
        { id?: string; project_id: string; code: string; label: string; order_index?: number },
        { code?: string; label?: string; order_index?: number }
      >
      imports: Table<
        {
          id: string
          project_id: string
          source_name: string
          filename: string
          format: ImportFormat
          raw_storage_path: string | null
          record_count: number
          imported_by: string
          created_at: string
          updated_at: string
        },
        {
          id?: string
          project_id: string
          source_name?: string
          filename: string
          format: ImportFormat
          raw_storage_path?: string | null
          record_count?: number
          imported_by: string
        },
        { record_count?: number }
      >
      records: Table<
        {
          id: string
          project_id: string
          import_id: string | null
          doi: string | null
          pmid: string | null
          scopus_eid: string | null
          raw: Record<string, unknown>
          title: string
          authors: string
          abstract: string | null
          year: number | null
          journal: string | null
          source_db: string | null
          dedup_group_id: string | null
          is_duplicate: boolean
          dedup_primary: boolean
          dedup_confirmed: boolean
          human_ref: string
          title_translated: string | null
          abstract_translated: string | null
          translated_at: string | null
          unpaywall_checked_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          project_id: string
          import_id?: string | null
          doi?: string | null
          pmid?: string | null
          scopus_eid?: string | null
          raw?: Record<string, unknown>
          title?: string
          authors?: string
          abstract?: string | null
          year?: number | null
          journal?: string | null
          source_db?: string | null
          dedup_group_id?: string | null
          is_duplicate?: boolean
          dedup_primary?: boolean
          dedup_confirmed?: boolean
          human_ref?: string
          title_translated?: string | null
          abstract_translated?: string | null
          translated_at?: string | null
          unpaywall_checked_at?: string | null
        },
        {
          doi?: string | null
          dedup_group_id?: string | null
          is_duplicate?: boolean
          dedup_primary?: boolean
          dedup_confirmed?: boolean
          title_translated?: string | null
          abstract_translated?: string | null
          translated_at?: string | null
          unpaywall_checked_at?: string | null
        }
      >
      record_counters: Table<
        { project_id: string; next_seq: number },
        { project_id: string; next_seq?: number },
        { next_seq?: number }
      >
      fulltext_docs: Table<
        {
          id: string
          record_id: string
          storage_path: string
          uploaded_by: string
          created_at: string
        },
        { id?: string; record_id: string; storage_path: string; uploaded_by: string },
        Record<string, never>
      >
      ai_screenings: Table<
        {
          id: string
          record_id: string
          model_name: string
          decision: Decision
          rationale: string | null
          confidence: number | null
          stage: ScreeningStage
          criteria_detail: AiCriterionDetail[]
          rescreen_count: number
          created_at: string
          updated_at: string
        },
        {
          id?: string
          record_id: string
          model_name: string
          decision: Decision
          rationale?: string | null
          confidence?: number | null
          stage: ScreeningStage
          criteria_detail?: AiCriterionDetail[]
          rescreen_count?: number
        },
        Record<string, never>
      >
      project_ai_providers: Table<
        {
          id: string
          project_id: string
          provider: AIProvider
          model: string
          api_key_encrypted: string
          is_active: boolean
          created_at: string
          updated_at: string
        },
        Record<string, never>,
        Record<string, never>
      >
      ai_pricing: Table<
        {
          id: string
          provider: AIProvider
          model: string
          input_price_per_million_tokens: number
          output_price_per_million_tokens: number
          currency: string
          updated_at: string
        },
        Record<string, never>,
        Record<string, never>
      >
      ai_usage_log: Table<
        {
          id: string
          project_id: string
          record_id: string
          provider: AIProvider
          model: string
          input_tokens: number
          output_tokens: number
          estimated_cost: number | null
          created_at: string
        },
        {
          id?: string
          project_id: string
          record_id: string
          provider: AIProvider
          model: string
          input_tokens?: number
          output_tokens?: number
          estimated_cost?: number | null
        },
        Record<string, never>
      >
      screenings: Table<
        {
          id: string
          record_id: string
          reviewer_id: string
          stage: ScreeningStage
          decision: Decision
          reasons: string[]
          notes: string
          decided_at: string
          created_at: string
          updated_at: string
        },
        {
          id?: string
          record_id: string
          reviewer_id: string
          stage: ScreeningStage
          decision: Decision
          reasons?: string[]
          notes?: string
          decided_at?: string
        },
        {
          decision?: Decision
          reasons?: string[]
          notes?: string
          decided_at?: string
        }
      >
      resolutions: Table<
        {
          id: string
          record_id: string
          stage: ScreeningStage
          resolved_decision: Decision
          resolved_by: string
          rationale: string
          resolved_at: string
          created_at: string
          updated_at: string
        },
        {
          id?: string
          record_id: string
          stage: ScreeningStage
          resolved_decision: Decision
          resolved_by: string
          rationale?: string
          resolved_at?: string
        },
        { resolved_decision?: Decision; rationale?: string; resolved_at?: string }
      >
      risk_of_bias_assessments: Table<
        {
          id: string
          record_id: string
          assessor_id: string
          tool: 'probast'
          domain: RobDomain
          answers: Record<string, RobAnswer>
          risk_judgment: RobJudgment | null
          applicability_judgment: RobJudgment | null
          justification: string
          created_at: string
          updated_at: string
        },
        {
          id?: string
          record_id: string
          assessor_id: string
          tool?: 'probast'
          domain: RobDomain
          answers?: Record<string, RobAnswer>
          risk_judgment?: RobJudgment | null
          applicability_judgment?: RobJudgment | null
          justification?: string
        },
        {
          answers?: Record<string, RobAnswer>
          risk_judgment?: RobJudgment | null
          applicability_judgment?: RobJudgment | null
          justification?: string
        }
      >
      extraction_fields: Table<
        {
          id: string
          project_id: string
          key: string
          label: string
          field_type: ExtractionFieldType
          options: string[]
          required: boolean
          order_index: number
          created_at: string
          updated_at: string
        },
        {
          id?: string
          project_id: string
          key: string
          label: string
          field_type: ExtractionFieldType
          options?: string[]
          required?: boolean
          order_index?: number
        },
        {
          key?: string
          label?: string
          field_type?: ExtractionFieldType
          options?: string[]
          required?: boolean
          order_index?: number
        }
      >
      data_extractions: Table<
        {
          id: string
          record_id: string
          extractor_id: string
          answers: Record<string, string | string[]>
          notes: string
          created_at: string
          updated_at: string
        },
        {
          id?: string
          record_id: string
          extractor_id: string
          answers?: Record<string, string | string[]>
          notes?: string
        },
        { answers?: Record<string, string | string[]>; notes?: string }
      >
      extraction_resolutions: Table<
        {
          id: string
          record_id: string
          field_key: string
          resolved_value: string | string[]
          resolved_by: string
          rationale: string
          resolved_at: string
          created_at: string
          updated_at: string
        },
        {
          id?: string
          record_id: string
          field_key: string
          resolved_value: string | string[]
          resolved_by: string
          rationale?: string
          resolved_at?: string
        },
        { resolved_value?: string | string[]; rationale?: string; resolved_at?: string }
      >
    }
    Views: {
      v_dedup_groups: View<{
          project_id: string
          dedup_group_id: string
          member_count: number
          record_ids: string[]
          has_primary: boolean
          confirmed: boolean
        }>
      v_record_stage_decisions: View<{
          record_id: string
          project_id: string
          stage: ScreeningStage
          reviewer_decisions: {
            reviewer_id: string | null
            decision: Decision
            reasons: string[]
            decided_at: string
            is_ai: boolean
          }[]
          reviews_count: number
          distinct_decision_count: number
          first_decision: Decision | null
        }>
      v_record_final_decision: View<{
          record_id: string
          project_id: string
          stage: ScreeningStage
          reviews_count: number
          distinct_decision_count: number
          reviewers_required: number
          resolved_decision: Decision | null
          final_decision: Decision | null
          is_conflict: boolean
        }>
      v_conflicts: View<{
          record_id: string
          project_id: string
          stage: ScreeningStage
          reviews_count: number
          distinct_decision_count: number
          reviewers_required: number
          resolved_decision: Decision | null
          final_decision: Decision | null
          is_conflict: boolean
        }>
      v_prisma_counts: View<{
          project_id: string
          records_identified: number
          duplicates_removed: number
          records_screened_ta: number
          excluded_ta: number
          fulltext_sought: number
          fulltext_assessed: number
          excluded_fulltext: number
          included_final: number
        }>
      v_fulltext_exclusion_reasons: View<{ project_id: string; reason_code: string; count: number }>
      v_extraction_field_status: View<{
          record_id: string
          project_id: string
          field_key: string
          extractors_count: number
          distinct_value_count: number
          first_value: string | string[]
          resolved_value: string | string[] | null
          final_value: string | string[] | null
          is_conflict: boolean
        }>
      v_project_ai_config: View<{
          project_id: string
          provider: AIProvider
          model: string
          has_key: boolean
          is_active: boolean
          updated_at: string
        }>
      v_ai_screening_stats: View<{
          project_id: string
          stage: ScreeningStage
          decision: Decision
          count: number
        }>
    }
    Functions: {
      create_project: {
        Args: {
          p_name: string
          p_description?: string
          p_prospero_id?: string | null
          p_reviewers_required_per_record?: number
          p_stages_enabled?: string[]
        }
        Returns: Database['public']['Tables']['projects']['Row']
      }
      increment_dedup_not_duplicate_count: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      set_project_ai_key: {
        Args: { p_project_id: string; p_provider: AIProvider; p_model: string; p_api_key: string; p_secret: string }
        Returns: undefined
      }
      set_project_ai_model: {
        Args: { p_project_id: string; p_provider: AIProvider; p_model: string }
        Returns: undefined
      }
      get_project_ai_key: {
        Args: { p_project_id: string; p_secret: string }
        Returns: { provider: AIProvider; model: string; api_key: string }[]
      }
      delete_project_ai_key: {
        Args: { p_project_id: string; p_provider: AIProvider }
        Returns: undefined
      }
      set_active_ai_provider: {
        Args: { p_project_id: string; p_provider: AIProvider }
        Returns: undefined
      }
    }
  }
}
