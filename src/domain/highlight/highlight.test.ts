import { describe, expect, it } from 'vitest'
import { highlightText, type HighlightTermSet } from './highlight'

const TERM_SETS: HighlightTermSet[] = [
  { category: 'population', terms: ['stroke', 'post-stroke'], color: '#e6d9f2' },
  { category: 'intervention', terms: ['machine learning', 'random forest'], color: '#c9ead4' },
  { category: 'outcome', terms: ['fugl-meyer', 'barthel'], color: '#cfe6f0' },
]

describe('highlightText', () => {
  it('returns a single plain segment when nothing matches', () => {
    const segments = highlightText('nothing to see here', TERM_SETS)
    expect(segments).toEqual([{ text: 'nothing to see here', category: null, color: null }])
  })

  it('returns an empty array for empty text', () => {
    expect(highlightText('', TERM_SETS)).toEqual([])
  })

  it('highlights a single term with its category and color', () => {
    const segments = highlightText('Patients with stroke were included.', TERM_SETS)
    expect(segments).toEqual([
      { text: 'Patients with ', category: null, color: null },
      { text: 'stroke', category: 'population', color: '#e6d9f2' },
      { text: ' were included.', category: null, color: null },
    ])
  })

  it('is case-insensitive', () => {
    const segments = highlightText('STROKE outcomes', TERM_SETS)
    expect(segments[0]).toEqual({ text: 'STROKE', category: 'population', color: '#e6d9f2' })
  })

  it('highlights multiple non-overlapping terms across categories', () => {
    const segments = highlightText('We used machine learning to predict stroke outcomes with the Barthel index.', TERM_SETS)
    const highlighted = segments.filter((s) => s.category)
    expect(highlighted.map((s) => s.category)).toEqual(['intervention', 'population', 'outcome'])
  })

  it('resolves overlapping matches by earlier-category precedence', () => {
    // "post-stroke" (population) and "stroke" (also population) overlap;
    // with population listed first, a hyphenated compound term should not
    // be split into two overlapping highlights.
    const overlapping: HighlightTermSet[] = [
      { category: 'a', terms: ['post-stroke'], color: '#111' },
      { category: 'b', terms: ['stroke'], color: '#222' },
    ]
    const segments = highlightText('post-stroke recovery', overlapping)
    expect(segments[0]).toEqual({ text: 'post-stroke', category: 'a', color: '#111' })
  })

  it('ignores empty term lists without throwing', () => {
    const sets: HighlightTermSet[] = [{ category: 'x', terms: [], color: '#000' }]
    expect(highlightText('some text', sets)).toEqual([{ text: 'some text', category: null, color: null }])
  })
})
