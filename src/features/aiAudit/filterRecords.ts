import type { Decision } from '@/types/domain'
import type { AiScreenedRecord } from './api'

export type DecisionFilter = 'all' | Decision

/** minConfidencePercent is on a 0-100 scale (matches the range input in
 * AiAuditPage); record confidence is stored as a 0-1 fraction. Records
 * with no confidence score always pass the threshold — there's nothing to
 * compare against, favoring recall over hiding them. */
export function filterAiScreenedRecords(
  records: AiScreenedRecord[],
  decisionFilter: DecisionFilter,
  minConfidencePercent: number,
): AiScreenedRecord[] {
  return records.filter((r) => {
    const matchesDecision = decisionFilter === 'all' || r.decision === decisionFilter
    const matchesConfidence =
      minConfidencePercent <= 0 || r.confidence === null || r.confidence * 100 >= minConfidencePercent
    return matchesDecision && matchesConfidence
  })
}
