import { describe, expect, it } from 'vitest'
import { buildVocabulary, tokenize, vectorize } from './textVectorizer'

describe('tokenize', () => {
  it('lowercases, strips punctuation, and drops stopwords/short tokens', () => {
    expect(tokenize('The Effects of Stroke Rehabilitation!')).toEqual(['effects', 'stroke', 'rehabilitation'])
  })

  it('handles accented characters as letters', () => {
    expect(tokenize('Avaliação da função motora')).toEqual(['avaliação', 'função', 'motora'])
  })

  it('returns an empty array for empty or purely-stopword text', () => {
    expect(tokenize('')).toEqual([])
    expect(tokenize('the and of')).toEqual([])
  })
})

describe('buildVocabulary', () => {
  it('counts document frequency, not raw term frequency', () => {
    const vocab = buildVocabulary(['cancer cancer treatment', 'cancer outcomes'], 10)
    // "cancer" appears in both documents -> df 2, even though it appears
    // twice in the first document.
    const idx = vocab.termToIndex.get('cancer')!
    expect(vocab.documentFrequency[idx]).toBe(2)
  })

  it('caps the vocabulary at maxSize, keeping the most frequent terms', () => {
    const docs = ['alpha beta', 'alpha gamma', 'alpha delta', 'beta epsilon']
    const vocab = buildVocabulary(docs, 2)
    expect(vocab.termToIndex.size).toBe(2)
    expect(vocab.termToIndex.has('alpha')).toBe(true) // df=3, most frequent
  })
})

describe('vectorize', () => {
  it('gives terms present in every document a low (but non-zero) weight, and absent terms none', () => {
    const vocab = buildVocabulary(['cancer treatment outcomes', 'cancer surgery recovery'], 10)
    const vector = vectorize('cancer treatment outcomes', vocab)
    const cancerIdx = vocab.termToIndex.get('cancer')!
    const treatmentIdx = vocab.termToIndex.get('treatment')!
    // "cancer" is in both docs (df=2) so its idf is lower than "treatment"'s (df=1).
    expect(vector.get(cancerIdx)!).toBeLessThan(vector.get(treatmentIdx)!)
    expect(vector.has(vocab.termToIndex.get('surgery')!)).toBe(false)
  })

  it('returns an empty vector for text with no usable tokens', () => {
    const vocab = buildVocabulary(['cancer treatment'], 10)
    expect(vectorize('the and of', vocab).size).toBe(0)
  })
})
