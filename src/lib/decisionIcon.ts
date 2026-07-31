import { CheckIcon, UncertainIcon, XIcon } from '@/components/ui/icons'
import type { Decision } from '@/types/domain'

/** Same three-way mapping as decisionLabelKey, for the icon-only spots
 * (screening triage buttons, per-record status flag, summary counts) that
 * used to spell out "Incluir"/"Incerto"/"Excluir" as text. */
export function decisionIcon(decision: Decision) {
  if (decision === 'INCLUDE') return CheckIcon
  if (decision === 'UNCERTAIN') return UncertainIcon
  return XIcon
}
