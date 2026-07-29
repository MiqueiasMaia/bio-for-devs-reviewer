import type { AiSetupResult } from '@/domain/aiSetup/schema'
import {
  createCriterion,
  createExclusionReason,
  createHighlightTerm,
} from '@/features/projects/settings/api'

export interface AiSetupImportStartIndex {
  criteria: number
  highlightTerms: number
  exclusionReasons: number
}

/**
 * Appends the AI-generated criteria/highlights/exclusion reasons to the
 * project's existing configuration — it never replaces or deletes
 * existing rows, since the reviewer may have already set some of this up
 * by hand. `startIndex` is the caller's next available order_index for
 * each list (same "max(existing) + 1" convention the settings tabs use),
 * so imported rows are appended after whatever's already there.
 */
export async function importAiSetupResult(
  projectId: string,
  parsed: AiSetupResult,
  startIndex: AiSetupImportStartIndex,
): Promise<void> {
  for (const [i, c] of parsed.criteria.entries()) {
    await createCriterion(projectId, {
      kind: c.kind,
      text: c.text,
      orderIndex: startIndex.criteria + i,
      picotsDimension: c.picotsDimension ?? null,
    })
  }
  for (const [i, h] of parsed.highlightTerms.entries()) {
    await createHighlightTerm(projectId, {
      category: h.category,
      terms: h.terms,
      color: h.color ?? '#94a3b8',
      orderIndex: startIndex.highlightTerms + i,
    })
  }
  for (const [i, r] of parsed.exclusionReasons.entries()) {
    await createExclusionReason(projectId, {
      code: r.code,
      label: r.label,
      orderIndex: startIndex.exclusionReasons + i,
    })
  }
}
