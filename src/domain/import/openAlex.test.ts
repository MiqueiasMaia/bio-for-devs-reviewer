import { describe, expect, it } from 'vitest'
import { bareOpenAlexId, parseOpenAlexWork, reconstructAbstract, type OpenAlexWork } from './openAlex'

describe('reconstructAbstract', () => {
  it('rebuilds plain text from an inverted index', () => {
    const index = { Background: [0], this: [1], study: [2, 5], evaluates: [3], a: [4], model: [6] }
    expect(reconstructAbstract(index)).toBe('Background this study evaluates a study model')
  })

  it('returns null for missing or empty indexes', () => {
    expect(reconstructAbstract(null)).toBeNull()
    expect(reconstructAbstract(undefined)).toBeNull()
    expect(reconstructAbstract({})).toBeNull()
  })
})

describe('bareOpenAlexId', () => {
  it('strips the openalex.org host from a work id url', () => {
    expect(bareOpenAlexId('https://openalex.org/W2001234567')).toBe('W2001234567')
  })

  it('leaves an already-bare id untouched', () => {
    expect(bareOpenAlexId('W2001234567')).toBe('W2001234567')
  })
})

describe('parseOpenAlexWork', () => {
  const baseWork: OpenAlexWork = {
    id: 'https://openalex.org/W2001234567',
    doi: 'https://doi.org/10.1016/example',
    title: 'A study of stroke recovery',
    display_name: 'A study of stroke recovery',
    publication_year: 2021,
    primary_location: { source: { display_name: 'The Lancet' } },
    authorships: [{ author: { display_name: 'Jane Doe' } }, { author: { display_name: 'John Smith' } }],
    abstract_inverted_index: { Background: [0], study: [1] },
    referenced_works: ['https://openalex.org/W1', 'https://openalex.org/W2'],
    ids: { pmid: 'https://pubmed.ncbi.nlm.nih.gov/25355680' },
  }

  it('maps fields into the shared ParsedRecord shape', () => {
    const parsed = parseOpenAlexWork(baseWork)
    expect(parsed.title).toBe('A study of stroke recovery')
    expect(parsed.authors).toBe('Jane Doe; John Smith')
    expect(parsed.abstract).toBe('Background study')
    expect(parsed.year).toBe(2021)
    expect(parsed.doi).toBe('https://doi.org/10.1016/example')
    expect(parsed.pmid).toBe('25355680')
    expect(parsed.journal).toBe('The Lancet')
    expect(parsed.sourceDb).toBe('snowballing')
    expect(parsed.raw).toEqual(baseWork)
  })

  it('falls back to display_name and tolerates missing optional fields', () => {
    const parsed = parseOpenAlexWork({
      ...baseWork,
      title: null,
      primary_location: null,
      authorships: null,
      abstract_inverted_index: null,
      ids: null,
    })
    expect(parsed.title).toBe('A study of stroke recovery')
    expect(parsed.authors).toBe('')
    expect(parsed.abstract).toBeNull()
    expect(parsed.journal).toBeNull()
    expect(parsed.pmid).toBeNull()
  })
})
