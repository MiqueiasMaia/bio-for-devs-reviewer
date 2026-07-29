import type { Decision } from '@/types/domain'

export type AiMatchBadge = {
  icon: string
  className: string
  label: string
}

/** Rayyan-style automated "does this look like it matches the review"
 * indicator, derived from the AI screening's own decision + confidence —
 * not a human reviewer vote, just a prioritization hint shown alongside
 * the article while a human reviewer makes the real call. High confidence
 * (>=0.8) gets the double icon, lower confidence gets a single one;
 * UNCERTAIN always gets the question mark regardless of confidence. */
const STRONG_CONFIDENCE_THRESHOLD = 0.8

export function computeAiMatchBadge(decision: Decision, confidence: number | null): AiMatchBadge {
  if (decision === 'UNCERTAIN') {
    return { icon: '❓', className: 'text-uncertain', label: 'uncertain' }
  }
  const strong = confidence !== null && confidence >= STRONG_CONFIDENCE_THRESHOLD
  if (decision === 'INCLUDE') {
    return strong
      ? { icon: '👍👍', className: 'text-include', label: 'strongInclude' }
      : { icon: '👍', className: 'text-include', label: 'weakInclude' }
  }
  return strong
    ? { icon: '👎👎', className: 'text-red-700', label: 'strongExclude' }
    : { icon: '👎', className: 'text-red-700', label: 'weakExclude' }
}
