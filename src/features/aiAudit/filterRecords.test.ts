import { describe, expect, it } from 'vitest'
import type { AiScreenedRecord } from './api'
import { filterAiScreenedRecords } from './filterRecords'

function record(overrides: Partial<AiScreenedRecord>): AiScreenedRecord {
  return {
    id: 'id',
    humanRef: 'R1',
    title: 'Title',
    authors: 'Author',
    year: 2026,
    decision: 'INCLUDE',
    confidence: 1,
    rationale: null,
    criteriaDetail: [],
    modelName: 'test-model',
    rescreenCount: 1,
    ...overrides,
  }
}

describe('filterAiScreenedRecords', () => {
  const records = [
    record({ id: '1', decision: 'INCLUDE', confidence: 0.9 }),
    record({ id: '2', decision: 'INCLUDE', confidence: 0.4 }),
    record({ id: '3', decision: 'EXCLUDE', confidence: 0.95 }),
    record({ id: '4', decision: 'UNCERTAIN', confidence: null }),
  ]

  it('applies no filter when decision is "all" and confidence threshold is 0', () => {
    expect(filterAiScreenedRecords(records, 'all', 0)).toHaveLength(4)
  })

  it('filters by decision alone', () => {
    const result = filterAiScreenedRecords(records, 'INCLUDE', 0)
    expect(result.map((r) => r.id)).toEqual(['1', '2'])
  })

  it('filters by confidence alone', () => {
    const result = filterAiScreenedRecords(records, 'all', 50)
    expect(result.map((r) => r.id)).toEqual(['1', '3', '4'])
  })

  it('combines decision and confidence filters (AND, not OR)', () => {
    const result = filterAiScreenedRecords(records, 'INCLUDE', 50)
    expect(result.map((r) => r.id)).toEqual(['1'])
  })

  it('always keeps records with null confidence regardless of threshold', () => {
    const result = filterAiScreenedRecords(records, 'UNCERTAIN', 100)
    expect(result.map((r) => r.id)).toEqual(['4'])
  })
})
