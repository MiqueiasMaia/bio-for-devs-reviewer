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

export interface AiSetupImportResult {
  criteriaAdded: number
  highlightTermsAdded: number
  exclusionReasonsAdded: number
  /** Rows that failed to insert — most commonly an exclusion reason code
   * that collides with the project's `unique (project_id, code)`
   * constraint, e.g. the AI suggesting a generic code ("no_full_text")
   * that already exists. */
  skipped: number
}

/**
 * Appends the AI-generated criteria/highlights/exclusion reasons to the
 * project's existing configuration — it never replaces or deletes
 * existing rows, since the reviewer may have already set some of this up
 * by hand. `startIndex` is the caller's next available order_index for
 * each list (same "max(existing) + 1" convention the settings tabs use),
 * so imported rows are appended after whatever's already there.
 *
 * Each row is inserted independently: one failing (e.g. a duplicate
 * exclusion-reason code) is skipped rather than aborting the whole import
 * and silently discarding everything already inserted before it.
 */
export async function importAiSetupResult(
  projectId: string,
  parsed: AiSetupResult,
  startIndex: AiSetupImportStartIndex,
): Promise<AiSetupImportResult> {
  let criteriaAdded = 0
  let highlightTermsAdded = 0
  let exclusionReasonsAdded = 0
  let skipped = 0

  for (const [i, c] of parsed.criteria.entries()) {
    try {
      await createCriterion(projectId, {
        kind: c.kind,
        text: c.text,
        orderIndex: startIndex.criteria + i,
        picotsDimension: c.picotsDimension ?? null,
      })
      criteriaAdded++
    } catch {
      skipped++
    }
  }
  for (const [i, h] of parsed.highlightTerms.entries()) {
    try {
      await createHighlightTerm(projectId, {
        category: h.category,
        terms: h.terms,
        color: h.color ?? '#94a3b8',
        orderIndex: startIndex.highlightTerms + i,
      })
      highlightTermsAdded++
    } catch {
      skipped++
    }
  }
  for (const [i, r] of parsed.exclusionReasons.entries()) {
    try {
      await createExclusionReason(projectId, {
        code: r.code,
        label: r.label,
        orderIndex: startIndex.exclusionReasons + i,
      })
      exclusionReasonsAdded++
    } catch {
      skipped++
    }
  }

  return { criteriaAdded, highlightTermsAdded, exclusionReasonsAdded, skipped }
}
