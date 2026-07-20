import { describe, expect, it } from 'vitest'
import { jaroSimilarity, jaroWinklerSimilarity } from './jaroWinkler'

describe('jaroSimilarity', () => {
  it('is 1 for identical strings', () => {
    expect(jaroSimilarity('stroke', 'stroke')).toBe(1)
  })

  it('is 0 for completely different strings', () => {
    expect(jaroSimilarity('abc', 'xyz')).toBe(0)
  })

  it('is 0 when either string is empty', () => {
    expect(jaroSimilarity('', 'abc')).toBe(0)
    expect(jaroSimilarity('abc', '')).toBe(0)
  })

  it('matches the classic MARTHA/MARHTA textbook example (~0.944)', () => {
    expect(jaroSimilarity('MARTHA', 'MARHTA')).toBeCloseTo(0.9444, 3)
  })
})

describe('jaroWinklerSimilarity', () => {
  it('scores at least as high as plain Jaro due to the prefix bonus', () => {
    const jw = jaroWinklerSimilarity('MARTHA', 'MARHTA')
    expect(jw).toBeGreaterThanOrEqual(jaroSimilarity('MARTHA', 'MARHTA'))
  })

  it('scores near-duplicate titles above 0.9', () => {
    const a = 'machine learning model for stroke outcome prediction'
    const b = 'machine learning model for stroke outcome predictions'
    expect(jaroWinklerSimilarity(a, b)).toBeGreaterThan(0.9)
  })

  it('scores unrelated titles low', () => {
    const a = 'machine learning model for stroke outcome prediction'
    const b = 'a randomized trial of aspirin in cardiovascular disease'
    expect(jaroWinklerSimilarity(a, b)).toBeLessThan(0.7)
  })
})
