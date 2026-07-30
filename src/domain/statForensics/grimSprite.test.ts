import { describe, expect, it } from 'vitest'
import { checkGrim, computeSdFeasibleRange, runStatForensics } from './grimSprite'

describe('checkGrim', () => {
  it('flags the classic Brown & Heathers inconsistent example (mean 3.86, n=20)', () => {
    const result = checkGrim({ mean: '3.86', n: 20 })
    expect(result?.consistent).toBe(false)
    expect(result?.nearestPossibleMean).toBeCloseTo(3.85)
  })

  it('accepts a mean that is exactly reachable by an integer sum', () => {
    // 77 / 20 = 3.85 exactly.
    const result = checkGrim({ mean: '3.85', n: 20 })
    expect(result?.consistent).toBe(true)
  })

  it('treats a whole-number mean as trivially checkable', () => {
    const result = checkGrim({ mean: '4', n: 10 })
    expect(result?.consistent).toBe(true)
  })

  it('returns null for a non-positive or non-integer n', () => {
    expect(checkGrim({ mean: '3.5', n: 0 })).toBeNull()
    expect(checkGrim({ mean: '3.5', n: -5 })).toBeNull()
    expect(checkGrim({ mean: '3.5', n: 10.5 })).toBeNull()
  })

  it('returns null for a malformed mean string', () => {
    expect(checkGrim({ mean: 'n/a', n: 20 })).toBeNull()
    expect(checkGrim({ mean: '', n: 20 })).toBeNull()
  })
})

describe('computeSdFeasibleRange', () => {
  it('computes the known extremal range for n=4, sum=10, bounds [1,5]', () => {
    // Tightest cluster: two 2's and two 3's -> variance = r(n-r)/n^2 = 2*2/16 = 0.25 -> SD 0.5.
    // Widest spread found by the one-interior-value search: {5,1,1,3} -> variance 2.75.
    const { minSd, maxSd } = computeSdFeasibleRange({ n: 4, sum: 10, min: 1, max: 5 })
    expect(minSd).toBeCloseTo(0.5)
    expect(maxSd).toBeCloseTo(Math.sqrt(2.75))
  })

  it('returns zero range when every value must equal the mean exactly', () => {
    // n=3, sum=9 -> mean=3, and min=max=3 forces every value to be 3.
    const { minSd, maxSd } = computeSdFeasibleRange({ n: 3, sum: 9, min: 3, max: 3 })
    expect(minSd).toBeCloseTo(0)
    expect(maxSd).toBeCloseTo(0)
  })
})

describe('runStatForensics', () => {
  it('flags a GRIM-inconsistent mean even with no SD/bounds data', () => {
    const result = runStatForensics({ mean: '3.86', n: '20' })
    expect(result.grim?.consistent).toBe(false)
    expect(result.sdRange).toBeNull()
    expect(result.hasWarning).toBe(true)
  })

  it('does not warn when only a consistent mean is available', () => {
    const result = runStatForensics({ mean: '3.85', n: '20' })
    expect(result.hasWarning).toBe(false)
  })

  it('flags an SD that falls outside the feasible range for the scale', () => {
    // mean=2.5, n=4, scale [1,5] -> feasible SD range is [0.5, sqrt(2.75)] ~= [0.5, 1.658].
    const result = runStatForensics({ mean: '2.5', n: '4', sd: '3', min: '1', max: '5' })
    expect(result.sdRange?.consistent).toBe(false)
    expect(result.hasWarning).toBe(true)
  })

  it('does not warn when the reported SD is within the feasible range', () => {
    const result = runStatForensics({ mean: '2.5', n: '4', sd: '1', min: '1', max: '5' })
    expect(result.sdRange?.consistent).toBe(true)
    expect(result.hasWarning).toBe(false)
  })

  it('skips the SD check when min/max scale bounds are not extracted', () => {
    const result = runStatForensics({ mean: '2.5', n: '4', sd: '3' })
    expect(result.sdRange).toBeNull()
  })

  it('produces no result at all when nothing usable was extracted', () => {
    const result = runStatForensics({})
    expect(result.grim).toBeNull()
    expect(result.sdRange).toBeNull()
    expect(result.hasWarning).toBe(false)
  })
})
