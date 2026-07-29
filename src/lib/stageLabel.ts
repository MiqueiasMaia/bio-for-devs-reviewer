import type { TranslationKey } from '@/i18n'
import type { StageKey } from '@/types/domain'

export function stageLabelKey(stage: StageKey): TranslationKey {
  switch (stage) {
    case 'title_abstract':
      return 'screening.stageTitleAbstract'
    case 'full_text':
      return 'screening.stageFullText'
    case 'conflicts':
      return 'projectNav.conflicts'
    case 'risk_of_bias':
      return 'projectNav.riskOfBias'
    case 'data_extraction':
      return 'projectNav.dataExtraction'
  }
}
