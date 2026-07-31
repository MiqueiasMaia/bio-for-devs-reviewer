/**
 * Hand-rolled logistic regression over sparse TF-IDF vectors (full-batch
 * gradient descent, L2-regularized, class-weighted) — the classifier
 * `reranker.ts` retrains after every batch of new screening decisions. No
 * ML dependency, same "zero external deps in src/domain" convention as
 * `dedup`/`riskOfBias`.
 */

export interface TrainingExample {
  vector: Map<number, number>
  label: 0 | 1
}

export interface LogisticRegressionModel {
  weights: Float64Array
  bias: number
}

export interface TrainOptions {
  iterations?: number
  learningRate?: number
  l2?: number
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z))
}

function rawScore(vector: Map<number, number>, weights: Float64Array, bias: number): number {
  let z = bias
  for (const [index, value] of vector) z += weights[index] * value
  return z
}

/** Class weights counter the usual title/abstract imbalance (far more
 * EXCLUDEs than INCLUDE/UNCERTAIN) — without this, a model trained on raw
 * counts learns to predict "irrelevant" for everything and technically
 * minimizes loss while being useless for reranking. */
function computeSampleWeights(examples: TrainingExample[]): number[] {
  const n = examples.length
  const positives = examples.filter((e) => e.label === 1).length
  const negatives = n - positives
  const posWeight = positives > 0 ? n / (2 * positives) : 1
  const negWeight = negatives > 0 ? n / (2 * negatives) : 1
  return examples.map((e) => (e.label === 1 ? posWeight : negWeight))
}

export function trainLogisticRegression(
  examples: TrainingExample[],
  vocabSize: number,
  options: TrainOptions = {},
): LogisticRegressionModel {
  const iterations = options.iterations ?? 200
  const learningRate = options.learningRate ?? 0.5
  const l2 = options.l2 ?? 0.01

  const weights = new Float64Array(vocabSize)
  let bias = 0
  if (examples.length === 0) return { weights, bias }

  const sampleWeights = computeSampleWeights(examples)
  const totalWeight = sampleWeights.reduce((a, b) => a + b, 0) || 1

  for (let iter = 0; iter < iterations; iter++) {
    const gradWeights = new Float64Array(vocabSize)
    let gradBias = 0

    for (let i = 0; i < examples.length; i++) {
      const { vector, label } = examples[i]
      const pred = sigmoid(rawScore(vector, weights, bias))
      const error = (pred - label) * sampleWeights[i]
      for (const [index, value] of vector) gradWeights[index] += error * value
      gradBias += error
    }

    for (let j = 0; j < vocabSize; j++) {
      weights[j] -= learningRate * (gradWeights[j] / totalWeight + l2 * weights[j])
    }
    bias -= learningRate * (gradBias / totalWeight)
  }

  return { weights, bias }
}

export function predictProbability(model: LogisticRegressionModel, vector: Map<number, number>): number {
  return sigmoid(rawScore(vector, model.weights, model.bias))
}
