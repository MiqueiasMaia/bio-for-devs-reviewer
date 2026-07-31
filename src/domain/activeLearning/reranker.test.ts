import { describe, expect, it } from 'vitest'
import { rerankQueue, type RerankInputRecord } from './reranker'

function record(
  id: string,
  title: string,
  decision: RerankInputRecord['decision'],
  abstract: string | null = null,
): RerankInputRecord {
  return { id, title, abstract, decision }
}

describe('rerankQueue', () => {
  it('reports insufficient_data before enough decisions exist', () => {
    const records = [
      record('1', 'Stroke rehabilitation outcomes', 'relevant'),
      record('2', 'Unrelated topic entirely', 'irrelevant'),
      record('3', 'Undecided study', null),
    ]
    const outcome = rerankQueue(records)
    expect(outcome.status).toBe('insufficient_data')
    if (outcome.status === 'insufficient_data') {
      expect(outcome.decidedCount).toBe(2)
      expect(outcome.positiveCount).toBe(1)
      expect(outcome.negativeCount).toBe(1)
    }
  })

  it('scores undecided records higher when their text resembles the relevant training examples', () => {
    const relevantWords = 'stroke rehabilitation motor recovery therapy intervention'
    const irrelevantWords = 'agriculture soil crop yield farming irrigation'

    const records: RerankInputRecord[] = [
      ...Array.from({ length: 5 }, (_, i) => record(`rel-${i}`, `${relevantWords} study number ${i}`, 'relevant')),
      ...Array.from({ length: 5 }, (_, i) => record(`irr-${i}`, `${irrelevantWords} report number ${i}`, 'irrelevant')),
      record('candidate-relevant', `${relevantWords} new candidate paper`, null),
      record('candidate-irrelevant', `${irrelevantWords} new candidate paper`, null),
    ]

    const outcome = rerankQueue(records)
    expect(outcome.status).toBe('trained')
    if (outcome.status !== 'trained') return

    const relevantScore = outcome.result.scores.get('candidate-relevant')!
    const irrelevantScore = outcome.result.scores.get('candidate-irrelevant')!
    expect(relevantScore).toBeGreaterThan(irrelevantScore)
    // Only undecided records get scored.
    expect(outcome.result.scores.has('rel-0')).toBe(false)
    expect(outcome.result.trainingSize).toBe(10)
  })
})
