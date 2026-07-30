import {
  AiIcon,
  AnalyticsIcon,
  ExtractionIcon,
  OverviewIcon,
  ReviewsIcon,
  RiskOfBiasIcon,
  ScreeningIcon,
  SettingsIcon,
  StudiesIcon,
  TeamIcon,
} from '@/components/ui/icons'
import { getApplicableStages, isStageUnlocked } from '@/domain/stageLock/stageLock'
import type { ProjectDetail } from '@/features/projects/api'
import type { TranslationKey } from '@/i18n'
import type { IconComponent } from './types'

export interface NavContext {
  project: ProjectDetail
  isOwner: boolean
}

export interface NavItem {
  id: string
  labelKey: TranslationKey
  /** Path relative to `/projects/:projectId`. */
  to: string
  isVisible?: (ctx: NavContext) => boolean
  isLocked?: (ctx: NavContext) => boolean
  /** Key looked up against the badge values computed by `ContextualSidebar` — kept
   * separate from this static config since badge values come from TanStack Query hooks. */
  badgeKey?: 'imported' | 'duplicates' | 'conflicts'
  future?: boolean
}

export interface NavGroup {
  id: string
  labelKey?: TranslationKey
  items: NavItem[]
}

export interface GlobalModule {
  id: string
  labelKey: TranslationKey
  icon: IconComponent
  /** Path relative to `/projects/:projectId` ('' = index route). Ignored for `reviews`, which always goes to `/projects`. */
  to?: string
  /** Whether this module needs an open review to make sense (hidden at `/projects`). */
  requiresProject: boolean
  groups?: (ctx: NavContext) => NavGroup[]
}

const stagesModuleVisible = (stage: 'title_abstract' | 'full_text') => (ctx: NavContext) =>
  ctx.project.settings.stages_enabled.includes(stage)

const stageLocked = (stage: 'title_abstract' | 'full_text') => (ctx: NavContext) => {
  const applicable = getApplicableStages(ctx.project.settings)
  return !isStageUnlocked(stage, ctx.project.settings.unlocked_stages, applicable)
}

export const globalModules: GlobalModule[] = [
  {
    id: 'reviews',
    labelKey: 'sidebar.reviews',
    icon: ReviewsIcon,
    requiresProject: false,
  },
  {
    id: 'overview',
    labelKey: 'projectNav.overview',
    icon: OverviewIcon,
    to: '',
    requiresProject: true,
    groups: () => [{ id: 'overview', items: [{ id: 'overview', labelKey: 'projectNav.overview', to: '' }] }],
  },
  {
    id: 'studies',
    labelKey: 'sidebar.studies',
    icon: StudiesIcon,
    to: 'import',
    requiresProject: true,
    groups: () => [
      {
        id: 'studies',
        items: [
          { id: 'import', labelKey: 'sidebar.imported', to: 'import', badgeKey: 'imported' },
          { id: 'duplicates', labelKey: 'duplicates.title', to: 'duplicates', badgeKey: 'duplicates' },
          { id: 'library', labelKey: 'sidebar.library', to: 'library', future: true },
        ],
      },
    ],
  },
  {
    id: 'screening',
    labelKey: 'sidebar.screening',
    icon: ScreeningIcon,
    to: 'screening/title-abstract',
    requiresProject: true,
    groups: () => [
      {
        id: 'screening',
        items: [
          {
            id: 'title-abstract',
            labelKey: 'screening.stageTitleAbstract',
            to: 'screening/title-abstract',
            isVisible: stagesModuleVisible('title_abstract'),
            isLocked: stageLocked('title_abstract'),
          },
          {
            id: 'full-text',
            labelKey: 'screening.stageFullText',
            to: 'screening/full-text',
            isVisible: stagesModuleVisible('full_text'),
            isLocked: stageLocked('full_text'),
          },
          { id: 'conflicts', labelKey: 'projectNav.conflicts', to: 'conflicts', badgeKey: 'conflicts' },
        ],
      },
      {
        id: 'screening-future',
        items: [
          { id: 'ai-prioritization', labelKey: 'sidebar.aiPrioritization', to: 'ai-prioritization', future: true },
          { id: 'active-learning', labelKey: 'sidebar.activeLearning', to: 'active-learning', future: true },
          {
            id: 'semi-automatic-screening',
            labelKey: 'sidebar.semiAutomaticScreening',
            to: 'semi-automatic-screening',
            future: true,
          },
        ],
      },
    ],
  },
  {
    id: 'risk-of-bias',
    labelKey: 'projectNav.riskOfBias',
    icon: RiskOfBiasIcon,
    to: 'risk-of-bias',
    requiresProject: true,
    groups: () => [
      {
        id: 'risk-of-bias',
        items: [
          {
            id: 'risk-of-bias',
            labelKey: 'projectNav.riskOfBias',
            to: 'risk-of-bias',
            isVisible: (ctx) => ctx.project.settings.risk_of_bias_enabled,
          },
          { id: 'ai-risk-assessment', labelKey: 'sidebar.aiRiskAssessment', to: 'ai-risk-assessment', future: true },
        ],
      },
    ],
  },
  {
    id: 'extraction',
    labelKey: 'sidebar.extraction',
    icon: ExtractionIcon,
    to: 'data-extraction',
    requiresProject: true,
    groups: () => [
      {
        id: 'extraction',
        items: [
          {
            id: 'data-extraction',
            labelKey: 'projectNav.dataExtraction',
            to: 'data-extraction',
            isVisible: (ctx) => ctx.project.settings.data_extraction_enabled,
          },
          {
            id: 'data-extraction-conflicts',
            labelKey: 'dataExtraction.conflictsTitle',
            to: 'data-extraction/conflicts',
            isVisible: (ctx) => ctx.project.settings.data_extraction_enabled,
          },
        ],
      },
      {
        id: 'extraction-future',
        items: [
          { id: 'ai-extraction', labelKey: 'sidebar.aiExtraction', to: 'ai-extraction', future: true },
          { id: 'table-extraction', labelKey: 'sidebar.tableExtraction', to: 'table-extraction', future: true },
          { id: 'figure-extraction', labelKey: 'sidebar.figureExtraction', to: 'figure-extraction', future: true },
          { id: 'pdf-annotation', labelKey: 'sidebar.pdfAnnotation', to: 'pdf-annotation', future: true },
        ],
      },
    ],
  },
  {
    id: 'analytics',
    labelKey: 'sidebar.analytics',
    icon: AnalyticsIcon,
    to: 'prisma',
    requiresProject: true,
    groups: () => [
      { id: 'analytics', items: [{ id: 'prisma', labelKey: 'projectNav.prisma', to: 'prisma' }] },
      {
        id: 'analysis-future',
        labelKey: 'sidebar.analysisGroup',
        items: [
          { id: 'grade', labelKey: 'sidebar.grade', to: 'grade', future: true },
          { id: 'meta-analysis', labelKey: 'sidebar.metaAnalysis', to: 'meta-analysis', future: true },
          { id: 'network-meta-analysis', labelKey: 'sidebar.networkMetaAnalysis', to: 'network-meta-analysis', future: true },
          { id: 'evidence-maps', labelKey: 'sidebar.evidenceMaps', to: 'evidence-maps', future: true },
        ],
      },
      {
        id: 'reports-future',
        labelKey: 'sidebar.reportsGroup',
        items: [
          { id: 'manuscript-generator', labelKey: 'sidebar.manuscriptGenerator', to: 'manuscript-generator', future: true },
          { id: 'journal-formatter', labelKey: 'sidebar.journalFormatter', to: 'journal-formatter', future: true },
          { id: 'ai-writing-assistant', labelKey: 'sidebar.aiWritingAssistant', to: 'ai-writing-assistant', future: true },
        ],
      },
    ],
  },
  {
    id: 'ai',
    labelKey: 'sidebar.ai',
    icon: AiIcon,
    to: 'ai-audit',
    requiresProject: true,
    groups: (ctx) => [
      {
        id: 'ai',
        items: [{ id: 'ai-audit', labelKey: 'projectNav.aiAudit', to: 'ai-audit', isVisible: () => ctx.isOwner }],
      },
      {
        id: 'ai-future',
        items: [
          { id: 'semantic-search', labelKey: 'sidebar.semanticSearch', to: 'semantic-search', future: true },
          { id: 'protocol-reviewer', labelKey: 'sidebar.protocolReviewer', to: 'protocol-reviewer', future: true },
          { id: 'pico-generator', labelKey: 'sidebar.picoGenerator', to: 'pico-generator', future: true },
          {
            id: 'search-strategy-optimizer',
            labelKey: 'sidebar.searchStrategyOptimizer',
            to: 'search-strategy-optimizer',
            future: true,
          },
          { id: 'eligibility-validator', labelKey: 'sidebar.eligibilityValidator', to: 'eligibility-validator', future: true },
          { id: 'study-summaries', labelKey: 'sidebar.studySummaries', to: 'study-summaries', future: true },
          { id: 'evidence-gap-detection', labelKey: 'sidebar.evidenceGapDetection', to: 'evidence-gap-detection', future: true },
          { id: 'literature-monitoring', labelKey: 'sidebar.literatureMonitoring', to: 'literature-monitoring', future: true },
        ],
      },
    ],
  },
  {
    id: 'team',
    labelKey: 'sidebar.team',
    icon: TeamIcon,
    to: 'settings/members',
    requiresProject: true,
    groups: () => [{ id: 'team', items: [{ id: 'members', labelKey: 'settingsNav.members', to: 'settings/members' }] }],
  },
  {
    id: 'settings',
    labelKey: 'projectNav.settings',
    icon: SettingsIcon,
    to: 'settings/general',
    requiresProject: true,
    groups: (ctx) => [
      {
        id: 'settings',
        items: [
          { id: 'general', labelKey: 'settingsNav.general', to: 'settings/general' },
          { id: 'import-settings', labelKey: 'settingsNav.import', to: 'settings/import' },
          { id: 'criteria', labelKey: 'settingsNav.criteria', to: 'settings/criteria' },
          { id: 'picots', labelKey: 'settingsNav.picots', to: 'settings/picots' },
          { id: 'exclusion-reasons', labelKey: 'settingsNav.exclusionReasons', to: 'settings/exclusion-reasons' },
          { id: 'extraction-fields', labelKey: 'settingsNav.extractionFields', to: 'settings/extraction-fields' },
          { id: 'ai-setup', labelKey: 'settingsNav.aiSetup', to: 'settings/ai-setup' },
          {
            id: 'ai-provider',
            labelKey: 'settingsNav.aiProvider',
            to: 'settings/ai-provider',
            isVisible: () => ctx.isOwner,
          },
        ],
      },
    ],
  },
]

export function findModule(id: string | undefined): GlobalModule | undefined {
  return globalModules.find((m) => m.id === id)
}

/** Which module a given relative pathname (inside `/projects/:projectId/*`) belongs to —
 * drives the sidebar's active-module highlight/auto-expand from the current URL. */
export function moduleIdForPath(relativePath: string): string {
  if (relativePath === '' || relativePath === '/') return 'overview'
  const p = relativePath.replace(/^\//, '')
  if (p === 'import' || p === 'duplicates') return 'studies'
  if (p.startsWith('screening/') || p === 'conflicts') return 'screening'
  if (p === 'risk-of-bias') return 'risk-of-bias'
  if (p.startsWith('data-extraction')) return 'extraction'
  if (p === 'prisma') return 'analytics'
  if (p === 'ai-audit') return 'ai'
  if (p === 'settings/members') return 'team'
  if (p.startsWith('settings')) return 'settings'
  return 'overview'
}
