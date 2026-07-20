import { describe, expect, it } from 'vitest'
import { computeDedupGroups, type DedupInputRecord } from './dedup'

const OPTIONS = { onDoi: true, onNormalizedTitle: true, titleSimilarityThreshold: 0.92 }

function rec(overrides: Partial<DedupInputRecord> & { id: string }): DedupInputRecord {
  return { doi: null, title: '', year: null, abstract: null, ...overrides }
}

describe('computeDedupGroups', () => {
  it('groups records that share a normalized DOI, regardless of case/prefix', () => {
    const records = [
      rec({ id: 'a', doi: '10.1/ABC', title: 'Study A' }),
      rec({ id: 'b', doi: 'https://doi.org/10.1/abc', title: 'A different title entirely' }),
      rec({ id: 'c', doi: '10.1/other', title: 'Unrelated study' }),
    ]
    const groups = computeDedupGroups(records, OPTIONS)
    expect(groups).toHaveLength(1)
    expect(groups[0].recordIds.sort()).toEqual(['a', 'b'])
  })

  it('groups records with near-identical normalized titles in the same year', () => {
    const records = [
      rec({ id: 'a', title: 'Machine learning for stroke outcome prediction', year: 2021 }),
      rec({ id: 'b', title: 'Machine learning for stroke outcome predictions', year: 2021 }),
      rec({ id: 'c', title: 'A completely unrelated cardiology study', year: 2021 }),
    ]
    const groups = computeDedupGroups(records, OPTIONS)
    expect(groups).toHaveLength(1)
    expect(groups[0].recordIds.sort()).toEqual(['a', 'b'])
  })

  it('does not group similar titles published in different years when year is known', () => {
    const records = [
      rec({ id: 'a', title: 'Machine learning for stroke outcome prediction', year: 2015 }),
      rec({ id: 'b', title: 'Machine learning for stroke outcome prediction', year: 2021 }),
    ]
    // Same year-bucketing rule would normally separate these, but identical
    // titles differing only by year are exactly the case a reviewer should
    // still get to see — the DOI/title match here is a deliberate corner
    // case showing bucketing is a performance optimization, not a filter:
    // records without a shared year and without a shared DOI are only
    // grouped if compared through the "missing year" fallback, so two
    // different known years never merge on title alone.
    const groups = computeDedupGroups(records, OPTIONS)
    expect(groups).toHaveLength(0)
  })

  it('leaves singletons out of the result', () => {
    const records = [rec({ id: 'a', title: 'Only one study', year: 2020 })]
    expect(computeDedupGroups(records, OPTIONS)).toEqual([])
  })

  it('picks the record with a DOI and an abstract as the primary', () => {
    const records = [
      rec({ id: 'a', doi: '10.1/x', title: 'Study X', abstract: null }),
      rec({ id: 'b', doi: '10.1/x', title: 'Study X', abstract: 'Has an abstract' }),
    ]
    const [group] = computeDedupGroups(records, OPTIONS)
    expect(group.primaryId).toBe('b')
  })

  it('respects onDoi/onNormalizedTitle toggles', () => {
    const records = [
      rec({ id: 'a', doi: '10.1/x', title: 'Alpha' }),
      rec({ id: 'b', doi: '10.1/x', title: 'Beta' }),
    ]
    expect(computeDedupGroups(records, { ...OPTIONS, onDoi: false })).toEqual([])
  })
})
