import type { Decision } from '@/types/domain'

export type AiMatchBadge = {
  decision: Decision
  /** Renders the decision icon twice instead of once — the strength
   * signal that used to be "👍" vs "👍👍". Always false for UNCERTAIN,
   * which has no strength dimension. */
  strong: boolean
  className: string
  label: string
}

/** Rayyan-style automated "does this look like it matches the review"
 * indicator, derived from the AI screening's own decision + confidence —
 * not a human reviewer vote, just a prioritization hint shown alongside
 * the article while a human reviewer makes the real call. High confidence
 * (>=0.8) is "strong" (rendered as a doubled icon), lower confidence is
 * "weak" (single icon); UNCERTAIN is always weak regardless of confidence. */
const STRONG_CONFIDENCE_THRESHOLD = 0.8

export function computeAiMatchBadge(decision: Decision, confidence: number | null): AiMatchBadge {
  if (decision === 'UNCERTAIN') {
    return { decision, strong: false, className: 'text-uncertain', label: 'uncertain' }
  }
  const strong = confidence !== null && confidence >= STRONG_CONFIDENCE_THRESHOLD
  if (decision === 'INCLUDE') {
    return { decision, strong, className: 'text-include', label: strong ? 'strongInclude' : 'weakInclude' }
  }
  return { decision, strong, className: 'text-red-700', label: strong ? 'strongExclude' : 'weakExclude' }
}
