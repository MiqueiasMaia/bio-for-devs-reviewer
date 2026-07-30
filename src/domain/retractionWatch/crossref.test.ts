import { describe, expect, it } from 'vitest'
import { findMostSevereNotice, isAtLeastAsSevere } from './crossref'

describe('findMostSevereNotice', () => {
  it('returns null when there are no updates', () => {
    expect(findMostSevereNotice(undefined)).toBeNull()
    expect(findMostSevereNotice(null)).toBeNull()
    expect(findMostSevereNotice([])).toBeNull()
  })

  it('ignores minor notice types (correction/erratum/addendum)', () => {
    const result = findMostSevereNotice([
      { DOI: '10.1/corr', type: 'correction' },
      { DOI: '10.1/err', type: 'erratum' },
    ])
    expect(result).toBeNull()
  })

  it('flags a retraction and extracts its date', () => {
    const result = findMostSevereNotice([
      { DOI: '10.1/ret', type: 'retraction', updated: { 'date-parts': [[2026, 3, 15]] } },
    ])
    expect(result).toEqual({ status: 'retraction', noticeDoi: '10.1/ret', noticeDate: '2026-03-15' })
  })

  it('prefers the more severe notice when several qualify', () => {
    const result = findMostSevereNotice([
      { DOI: '10.1/concern', type: 'expression_of_concern' },
      { DOI: '10.1/ret', type: 'retraction' },
    ])
    expect(result?.status).toBe('retraction')
    expect(result?.noticeDoi).toBe('10.1/ret')
  })

  it('mixes flagged and unflagged types, keeping only the flagged one', () => {
    const result = findMostSevereNotice([
      { DOI: '10.1/corr', type: 'correction' },
      { DOI: '10.1/with', type: 'withdrawal' },
    ])
    expect(result?.status).toBe('withdrawal')
  })

  it('handles a missing date gracefully', () => {
    const result = findMostSevereNotice([{ DOI: '10.1/ret', type: 'retraction' }])
    expect(result?.noticeDate).toBeNull()
  })
})

describe('isAtLeastAsSevere', () => {
  it('always upgrades from no prior flag', () => {
    expect(isAtLeastAsSevere('correction_or_whatever', null)).toBe(true)
  })

  it('allows escalating to a more severe status', () => {
    expect(isAtLeastAsSevere('retraction', 'expression_of_concern')).toBe(true)
  })

  it('refuses to downgrade to a less severe status', () => {
    expect(isAtLeastAsSevere('expression_of_concern', 'retraction')).toBe(false)
  })

  it('allows re-confirming the same status', () => {
    expect(isAtLeastAsSevere('retraction', 'retraction')).toBe(true)
  })

  it('never lets an unrecognized candidate type override an existing flag', () => {
    expect(isAtLeastAsSevere('not_a_real_type', 'retraction')).toBe(false)
  })

  it('always upgrades over an unrecognized stored value', () => {
    expect(isAtLeastAsSevere('withdrawal', 'some_legacy_value')).toBe(true)
  })
})
