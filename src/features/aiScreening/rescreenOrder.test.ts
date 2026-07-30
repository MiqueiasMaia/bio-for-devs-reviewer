import { describe, expect, it } from 'vitest'
import { orderForRescreening, type RescreenInfo } from './rescreenOrder'

describe('orderForRescreening', () => {
  it('puts never-screened records (no entry) before any screened one', () => {
    const infoById = new Map<string, RescreenInfo>([['b', { rescreenCount: 1, updatedAt: '2026-01-01' }]])
    expect(orderForRescreening(['a', 'b'], infoById)).toEqual(['a', 'b'])
  })

  it('orders by lowest rescreenCount first', () => {
    const infoById = new Map<string, RescreenInfo>([
      ['a', { rescreenCount: 3, updatedAt: '2026-01-01' }],
      ['b', { rescreenCount: 1, updatedAt: '2026-01-01' }],
      ['c', { rescreenCount: 2, updatedAt: '2026-01-01' }],
    ])
    expect(orderForRescreening(['a', 'b', 'c'], infoById)).toEqual(['b', 'c', 'a'])
  })

  it('breaks ties on equal rescreenCount by oldest updatedAt first', () => {
    const infoById = new Map<string, RescreenInfo>([
      ['a', { rescreenCount: 1, updatedAt: '2026-01-03' }],
      ['b', { rescreenCount: 1, updatedAt: '2026-01-01' }],
      ['c', { rescreenCount: 1, updatedAt: '2026-01-02' }],
    ])
    expect(orderForRescreening(['a', 'b', 'c'], infoById)).toEqual(['b', 'c', 'a'])
  })

  it('never lets a record reach round N+1 before every other record reaches round N (100 records, batches of 50)', () => {
    // Simulates the exact scenario reported: 100 already-screened records
    // (all rescreenCount 1), reprocessed in batches of 50, repeatedly.
    const ids = Array.from({ length: 100 }, (_, i) => `r${i}`)
    const infoById = new Map<string, RescreenInfo>(
      ids.map((id, i) => [id, { rescreenCount: 1, updatedAt: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z` }]),
    )

    function runBatch(batchSize: number) {
      const batch = orderForRescreening(ids, infoById).slice(0, batchSize)
      const now = new Date().toISOString()
      for (const id of batch) {
        const current = infoById.get(id)!
        infoById.set(id, { rescreenCount: current.rescreenCount + 1, updatedAt: now })
      }
      return batch
    }

    const firstBatch = runBatch(50)
    const secondBatch = runBatch(50)

    // The second run must cover the OTHER 50 records, not re-do the first batch.
    expect(new Set(secondBatch).size).toBe(50)
    expect(secondBatch.some((id) => firstBatch.includes(id))).toBe(false)

    // After both batches, every record has been reprocessed exactly once —
    // nobody has reached round 3 yet.
    const counts = [...infoById.values()].map((v) => v.rescreenCount)
    expect(Math.max(...counts)).toBe(2)
    expect(Math.min(...counts)).toBe(2)

    // A third batch of 50 is now free to push everyone to round 3, since
    // round 2 is fully complete for all 100 records.
    const thirdBatch = runBatch(50)
    expect(thirdBatch).toHaveLength(50)
  })
})
