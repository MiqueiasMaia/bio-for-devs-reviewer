export interface HighlightTermSet {
  category: string
  terms: string[]
  color: string
}

export interface HighlightSegment {
  text: string
  category: string | null
  color: string | null
}

interface Match {
  start: number
  end: number
  category: string
  color: string
  precedence: number
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildRegex(terms: string[]): RegExp | null {
  const escaped = terms.map((t) => t.trim()).filter(Boolean).map(escapeRegExp)
  if (escaped.length === 0) return null
  // Leading word-boundary only (no trailing \b), matching the behavior of
  // the original single-file screener this app replaces — terms like
  // "post-stroke" or "k-nearest" still match correctly since \b only needs
  // to hold at the start of the alternation.
  return new RegExp(`\\b(${escaped.join('|')})`, 'gi')
}

/**
 * Splits `text` into plain and highlighted segments based on the project's
 * highlight_terms configuration. `termSets` order is the precedence used to
 * resolve overlaps: earlier sets win. Matches never overlap in the output —
 * this is a greedy non-overlapping interval selection over every category's
 * matches, sorted by start position then precedence.
 */
export function highlightText(text: string, termSets: HighlightTermSet[]): HighlightSegment[] {
  if (!text) return []

  const matches: Match[] = []
  termSets.forEach((set, precedence) => {
    const re = buildRegex(set.terms)
    if (!re) return
    for (const m of text.matchAll(re)) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        category: set.category,
        color: set.color,
        precedence,
      })
    }
  })

  matches.sort((a, b) => a.start - b.start || a.precedence - b.precedence)

  const selected: Match[] = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.start >= lastEnd) {
      selected.push(m)
      lastEnd = m.end
    }
  }

  const segments: HighlightSegment[] = []
  let cursor = 0
  for (const m of selected) {
    if (m.start > cursor) segments.push({ text: text.slice(cursor, m.start), category: null, color: null })
    segments.push({ text: text.slice(m.start, m.end), category: m.category, color: m.color })
    cursor = m.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), category: null, color: null })

  return segments
}
