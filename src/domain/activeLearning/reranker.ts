import { buildVocabulary, vectorize } from './textVectorizer'
import { trainLogisticRegression, predictProbability } from './logisticRegression'

/**
 * Orchestrates the MVP active-learning reranker (docs/pending-items.md
 * §6.1): TF-IDF + logistic regression trained on whichever title/abstract
 * records already have a settled decision, scoring the rest by predicted
 * probability of being relevant (INCLUDE or UNCERTAIN — either continues
 * the review — vs EXCLUDE). Reordering only: no statistical stopping rule
 * or recall guarantee, unlike full ASReview — that's future work (see the
 * doc for why this was scoped down for a first version).
 */

export const MIN_TRAINING_EXAMPLES = 10
export const MIN_EXAMPLES_PER_CLASS = 3
const MAX_VOCAB_SIZE = 600

export interface RerankInputRecord {
  id: string
  title: string
  abstract: string | null
  /** Null when this record has no settled title/abstract decision yet —
   * it's a scoring target, not a training example. */
  decision: 'relevant' | 'irrelevant' | null
}

export interface RerankResult {
  /** recordId -> predicted probability of relevance, only for records that
   * had no decision (there is nothing useful to score a decided record for). */
  scores: Map<string, number>
  trainingSize: number
}

export type RerankOutcome =
  | { status: 'trained'; result: RerankResult }
  | { status: 'insufficient_data'; decidedCount: number; positiveCount: number; negativeCount: number }

export function rerankQueue(records: RerankInputRecord[]): RerankOutcome {
  const decided = records.filter((r) => r.decision !== null)
  const positiveCount = decided.filter((r) => r.decision === 'relevant').length
  const negativeCount = decided.filter((r) => r.decision === 'irrelevant').length

  if (
    decided.length < MIN_TRAINING_EXAMPLES ||
    positiveCount < MIN_EXAMPLES_PER_CLASS ||
    negativeCount < MIN_EXAMPLES_PER_CLASS
  ) {
    return { status: 'insufficient_data', decidedCount: decided.length, positiveCount, negativeCount }
  }

  const documents = records.map((r) => `${r.title} ${r.abstract ?? ''}`)
  const vocab = buildVocabulary(documents, MAX_VOCAB_SIZE)
  const vectors = documents.map((doc) => vectorize(doc, vocab))

  const trainingExamples = records
    .map((r, i) => ({ decision: r.decision, vector: vectors[i] }))
    .filter((x): x is { decision: 'relevant' | 'irrelevant'; vector: Map<number, number> } => x.decision !== null)
    .map((x) => ({ vector: x.vector, label: (x.decision === 'relevant' ? 1 : 0) as 0 | 1 }))

  const model = trainLogisticRegression(trainingExamples, vocab.termToIndex.size)

  const scores = new Map<string, number>()
  records.forEach((r, i) => {
    if (r.decision === null) scores.set(r.id, predictProbability(model, vectors[i]))
  })

  return { status: 'trained', result: { scores, trainingSize: trainingExamples.length } }
}
