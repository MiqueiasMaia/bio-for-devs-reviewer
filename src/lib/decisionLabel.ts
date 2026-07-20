import type { TranslationKey } from '@/i18n'
import type { Decision } from '@/types/domain'

export function decisionLabelKey(decision: Decision): TranslationKey {
  if (decision === 'INCLUDE') return 'screening.include'
  if (decision === 'UNCERTAIN') return 'screening.uncertain'
  return 'screening.exclude'
}
