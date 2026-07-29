import { describe, expect, it } from 'vitest'
import { computeAiMatchBadge } from './aiMatchBadge'

describe('computeAiMatchBadge', () => {
  it('shows two thumbs up for high-confidence INCLUDE', () => {
    expect(computeAiMatchBadge('INCLUDE', 0.95).icon).toBe('👍👍')
  })

  it('shows one thumb up for low-confidence INCLUDE', () => {
    expect(computeAiMatchBadge('INCLUDE', 0.6).icon).toBe('👍')
  })

  it('shows two thumbs down for high-confidence EXCLUDE', () => {
    expect(computeAiMatchBadge('EXCLUDE', 1).icon).toBe('👎👎')
  })

  it('shows one thumb down for low-confidence EXCLUDE', () => {
    expect(computeAiMatchBadge('EXCLUDE', 0.5).icon).toBe('👎')
  })

  it('shows a question mark for UNCERTAIN regardless of confidence', () => {
    expect(computeAiMatchBadge('UNCERTAIN', 0.9).icon).toBe('❓')
    expect(computeAiMatchBadge('UNCERTAIN', null).icon).toBe('❓')
  })

  it('treats null confidence as not strong', () => {
    expect(computeAiMatchBadge('INCLUDE', null).icon).toBe('👍')
    expect(computeAiMatchBadge('EXCLUDE', null).icon).toBe('👎')
  })
})
