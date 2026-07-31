import { describe, expect, it } from 'vitest'
import { predictProbability, trainLogisticRegression, type TrainingExample } from './logisticRegression'

function vec(entries: [number, number][]): Map<number, number> {
  return new Map(entries)
}

describe('trainLogisticRegression', () => {
  it('learns to separate two linearly-separable feature groups', () => {
    // Feature 0 present -> positive class; feature 1 present -> negative.
    const examples: TrainingExample[] = [
      { vector: vec([[0, 1]]), label: 1 },
      { vector: vec([[0, 0.8]]), label: 1 },
      { vector: vec([[0, 0.9]]), label: 1 },
      { vector: vec([[1, 1]]), label: 0 },
      { vector: vec([[1, 0.8]]), label: 0 },
      { vector: vec([[1, 0.9]]), label: 0 },
    ]
    const model = trainLogisticRegression(examples, 2)
    expect(predictProbability(model, vec([[0, 1]]))).toBeGreaterThan(0.7)
    expect(predictProbability(model, vec([[1, 1]]))).toBeLessThan(0.3)
  })

  it('returns an unbiased (0.5) model when there are no examples', () => {
    const model = trainLogisticRegression([], 5)
    expect(predictProbability(model, vec([[0, 1]]))).toBeCloseTo(0.5)
  })

  it('does not collapse to the majority class under heavy imbalance', () => {
    // 20 negatives, 3 positives — without class weighting a model can
    // minimize loss by ~always predicting negative; with it, the few
    // positive examples' own feature should still score above 0.5.
    const examples: TrainingExample[] = [
      ...Array.from({ length: 20 }, (): TrainingExample => ({ vector: vec([[1, 1]]), label: 0 })),
      ...Array.from({ length: 3 }, (): TrainingExample => ({ vector: vec([[0, 1]]), label: 1 })),
    ]
    const model = trainLogisticRegression(examples, 2)
    expect(predictProbability(model, vec([[0, 1]]))).toBeGreaterThan(0.5)
  })

  it('always returns a probability between 0 and 1', () => {
    const examples: TrainingExample[] = [
      { vector: vec([[0, 5]]), label: 1 },
      { vector: vec([[1, 5]]), label: 0 },
    ]
    const model = trainLogisticRegression(examples, 2, { iterations: 500 })
    const p = predictProbability(model, vec([[0, 5]]))
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
})
