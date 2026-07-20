import { describe, expect, it } from 'vitest'
import { buildFleissMatrix, cohenKappa, fleissKappa, percentAgreement } from './kappa'

describe('cohenKappa', () => {
  // Textbook example (widely cited, e.g. Wikipedia's "Cohen's kappa"):
  // 50 items, 2x2 contingency table:
  //             B yes   B no
  //   A yes       20      5
  //   A no        10      15
  // po = 35/50 = 0.7 ; pe = 0.5 ; kappa = (0.7-0.5)/(1-0.5) = 0.4
  it('matches the classic 50-item hand-checked example (kappa = 0.4)', () => {
    const ratingsA = [
      ...Array(20).fill('yes'), // A yes, B yes
      ...Array(5).fill('yes'), // A yes, B no
      ...Array(10).fill('no'), // A no, B yes
      ...Array(15).fill('no'), // A no, B no
    ]
    const ratingsB = [
      ...Array(20).fill('yes'),
      ...Array(5).fill('no'),
      ...Array(10).fill('yes'),
      ...Array(15).fill('no'),
    ]
    const result = cohenKappa(ratingsA, ratingsB, ['yes', 'no'])
    expect(result.observedAgreement).toBeCloseTo(0.7, 5)
    expect(result.expectedAgreement).toBeCloseTo(0.5, 5)
    expect(result.kappa).toBeCloseTo(0.4, 5)
  })

  it('is 1 for perfect agreement', () => {
    const ratings = ['INCLUDE', 'EXCLUDE', 'UNCERTAIN', 'INCLUDE']
    const result = cohenKappa(ratings, ratings, ['INCLUDE', 'EXCLUDE', 'UNCERTAIN'])
    expect(result.kappa).toBe(1)
    expect(result.observedAgreement).toBe(1)
  })

  it('returns NaN for empty input', () => {
    expect(cohenKappa([], [], ['a', 'b']).kappa).toBeNaN()
  })
})

describe('fleissKappa', () => {
  // Hand-computed 4-item / 3-rater / 2-category example:
  //   item1: III (3 include)      -> P_i = 1
  //   item2: III (3 include)      -> P_i = 1
  //   item3: EEE (3 exclude)      -> P_i = 1
  //   item4: IIE (2 include, 1 exclude) -> P_i = (4+1-3)/6 = 1/3
  // p_include = 8/12 = 2/3, p_exclude = 4/12 = 1/3
  // P_bar = (1+1+1+1/3)/4 = 5/6 ; P_e_bar = (2/3)^2+(1/3)^2 = 5/9
  // kappa = (5/6 - 5/9) / (1 - 5/9) = (5/18)/(8/18) = 5/8 = 0.625
  it('matches a hand-computed 4-item/3-rater example (kappa = 0.625)', () => {
    const matrix = [
      [3, 0],
      [3, 0],
      [0, 3],
      [2, 1],
    ]
    const result = fleissKappa(matrix)
    expect(result.observedAgreement).toBeCloseTo(5 / 6, 6)
    expect(result.expectedAgreement).toBeCloseTo(5 / 9, 6)
    expect(result.kappa).toBeCloseTo(0.625, 6)
  })

  it('is 1 for unanimous agreement on every item', () => {
    const matrix = [
      [3, 0],
      [0, 3],
    ]
    expect(fleissKappa(matrix).kappa).toBe(1)
  })

  it('reduces to Cohen-equivalent structure with 2 raters', () => {
    // 2 raters, 2 categories, same contingency as the Cohen example above
    // (20 both-yes, 5 A-yes/B-no, 10 A-no/B-yes, 15 both-no), expressed as
    // per-item rater counts instead of paired arrays.
    const matrix = [
      ...Array(20).fill([2, 0]), // both yes
      ...Array(5).fill([1, 1]), // split
      ...Array(10).fill([1, 1]), // split
      ...Array(15).fill([0, 2]), // both no
    ]
    const result = fleissKappa(matrix)
    // Not numerically identical to Cohen's kappa (different weighting of
    // "split" cells), but should land in the same agreement ballpark.
    expect(result.kappa).toBeGreaterThan(0)
    expect(result.kappa).toBeLessThan(1)
  })
})

describe('buildFleissMatrix', () => {
  it('groups entries by item and excludes items with an inconsistent rater count', () => {
    const entries = [
      { itemId: 'a', raterId: 'r1', decision: 'INCLUDE' },
      { itemId: 'a', raterId: 'r2', decision: 'INCLUDE' },
      { itemId: 'b', raterId: 'r1', decision: 'EXCLUDE' },
      { itemId: 'b', raterId: 'r2', decision: 'INCLUDE' },
      // 'c' only has one rater so far — should be excluded (n=2 is the mode)
      { itemId: 'c', raterId: 'r1', decision: 'INCLUDE' },
    ]
    const { matrix, n, itemIds } = buildFleissMatrix(entries, ['INCLUDE', 'EXCLUDE'])
    expect(n).toBe(2)
    expect(itemIds.sort()).toEqual(['a', 'b'])
    expect(matrix).toHaveLength(2)
  })
})

describe('percentAgreement', () => {
  it('counts the fraction of unanimous items', () => {
    const matrix = [
      [3, 0],
      [0, 3],
      [2, 1],
    ]
    expect(percentAgreement(matrix)).toBeCloseTo(2 / 3, 6)
  })
})
