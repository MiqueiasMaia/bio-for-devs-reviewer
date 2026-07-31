import { describe, expect, it } from 'vitest'
import { computeAiMatchBadge } from './aiMatchBadge'

describe('computeAiMatchBadge', () => {
  it('marks high-confidence INCLUDE as strong', () => {
    const badge = computeAiMatchBadge('INCLUDE', 0.95)
    expect(badge.decision).toBe('INCLUDE')
    expect(badge.strong).toBe(true)
  })

  it('marks low-confidence INCLUDE as weak', () => {
    expect(computeAiMatchBadge('INCLUDE', 0.6).strong).toBe(false)
  })

  it('marks high-confidence EXCLUDE as strong', () => {
    const badge = computeAiMatchBadge('EXCLUDE', 1)
    expect(badge.decision).toBe('EXCLUDE')
    expect(badge.strong).toBe(true)
  })

  it('marks low-confidence EXCLUDE as weak', () => {
    expect(computeAiMatchBadge('EXCLUDE', 0.5).strong).toBe(false)
  })

  it('treats UNCERTAIN as weak regardless of confidence', () => {
    expect(computeAiMatchBadge('UNCERTAIN', 0.9).strong).toBe(false)
    expect(computeAiMatchBadge('UNCERTAIN', null).strong).toBe(false)
  })

  it('treats null confidence as not strong', () => {
    expect(computeAiMatchBadge('INCLUDE', null).strong).toBe(false)
    expect(computeAiMatchBadge('EXCLUDE', null).strong).toBe(false)
  })
})
