import { describe, expect, it } from 'vitest'
import { isGroupAutoResolvable, type AutoResolveCriteria, type AutoResolveRecord } from './autoResolve'

const NONE: AutoResolveCriteria = {
  doi: false,
  title: false,
  year: false,
  authors: false,
  journal: false,
  titleSimilarityThreshold: null,
}

function rec(overrides: Partial<AutoResolveRecord> & { id: string }): AutoResolveRecord {
  return { doi: null, title: '', authors: '', year: null, journal: null, ...overrides }
}

describe('isGroupAutoResolvable', () => {
  it('is resolvable with no criteria enabled', () => {
    const records = [rec({ id: 'a', title: 'X' }), rec({ id: 'b', title: 'Y' })]
    expect(isGroupAutoResolvable(records, NONE)).toBe(true)
  })

  it('requires DOI to match (normalized) when the doi criterion is on', () => {
    const criteria = { ...NONE, doi: true }
    const matching = [rec({ id: 'a', doi: '10.1/ABC' }), rec({ id: 'b', doi: 'https://doi.org/10.1/abc' })]
    expect(isGroupAutoResolvable(matching, criteria)).toBe(true)

    const mismatching = [rec({ id: 'a', doi: '10.1/abc' }), rec({ id: 'b', doi: '10.1/xyz' })]
    expect(isGroupAutoResolvable(mismatching, criteria)).toBe(false)

    const missing = [rec({ id: 'a', doi: null }), rec({ id: 'b', doi: null })]
    expect(isGroupAutoResolvable(missing, criteria)).toBe(false)
  })

  it('requires year to match exactly, and rejects when any record lacks a year', () => {
    const criteria = { ...NONE, year: true }
    expect(isGroupAutoResolvable([rec({ id: 'a', year: 2020 }), rec({ id: 'b', year: 2020 })], criteria)).toBe(true)
    expect(isGroupAutoResolvable([rec({ id: 'a', year: 2020 }), rec({ id: 'b', year: 2021 })], criteria)).toBe(false)
    expect(isGroupAutoResolvable([rec({ id: 'a', year: 2020 }), rec({ id: 'b', year: null })], criteria)).toBe(false)
  })

  it('enforces a minimum pairwise title similarity across every member', () => {
    const criteria = { ...NONE, titleSimilarityThreshold: 0.95 }
    const close = [
      rec({ id: 'a', title: 'Machine learning for stroke outcome prediction' }),
      rec({ id: 'b', title: 'Machine learning for stroke outcome predictions' }),
    ]
    expect(isGroupAutoResolvable(close, criteria)).toBe(true)

    const far = [rec({ id: 'a', title: 'Machine learning for stroke' }), rec({ id: 'b', title: 'A completely unrelated cardiology study' })]
    expect(isGroupAutoResolvable(far, criteria)).toBe(false)
  })

  it('requires every enabled criterion to hold, not just one', () => {
    const criteria = { ...NONE, doi: true, year: true }
    const matchesDoiOnly = [
      rec({ id: 'a', doi: '10.1/x', year: 2020 }),
      rec({ id: 'b', doi: '10.1/x', year: 2021 }),
    ]
    expect(isGroupAutoResolvable(matchesDoiOnly, criteria)).toBe(false)
  })

  it('treats a single-member group as trivially resolvable', () => {
    expect(isGroupAutoResolvable([rec({ id: 'a' })], { ...NONE, doi: true, year: true })).toBe(true)
  })
})
