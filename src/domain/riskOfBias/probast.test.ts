import { describe, expect, it } from 'vitest'
import { PROBAST_DOMAINS, ROB_ANSWER_OPTIONS, ROB_JUDGMENT_OPTIONS } from './probast'

describe('PROBAST_DOMAINS', () => {
  it('has exactly the 4 PROBAST domains, in order', () => {
    expect(PROBAST_DOMAINS.map((d) => d.id)).toEqual(['participants', 'predictors', 'outcome', 'analysis'])
  })

  it('gives every domain at least one signalling question', () => {
    for (const domain of PROBAST_DOMAINS) {
      expect(domain.signallingQuestions.length).toBeGreaterThan(0)
    }
  })

  it('has unique question ids within each domain', () => {
    for (const domain of PROBAST_DOMAINS) {
      const ids = domain.signallingQuestions.map((q) => q.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('only excludes applicability judgment for the Analysis domain', () => {
    const withApplicability = PROBAST_DOMAINS.filter((d) => d.hasApplicability).map((d) => d.id)
    expect(withApplicability).toEqual(['participants', 'predictors', 'outcome'])
  })
})

describe('answer/judgment options', () => {
  it('has the 5 standard PROBAST signalling-question answers', () => {
    expect(ROB_ANSWER_OPTIONS).toEqual(['yes', 'probably_yes', 'probably_no', 'no', 'no_information'])
  })

  it('has the 3 standard risk-of-bias judgments', () => {
    expect(ROB_JUDGMENT_OPTIONS).toEqual(['low', 'unclear', 'high'])
  })
})
