/**
 * TF-IDF vectorization for title+abstract text — the feature representation
 * the active-learning reranker (src/domain/activeLearning/reranker.ts)
 * trains on. Pure, hand-rolled, English-only stopword list: scientific
 * titles/abstracts in a systematic review are overwhelmingly in English
 * regardless of the app's own (pt-BR) UI locale, so a bilingual list would
 * add complexity for little real benefit — revisit if that assumption
 * stops holding.
 */

const STOPWORDS = new Set([
  'the', 'and', 'of', 'in', 'to', 'a', 'is', 'are', 'was', 'were', 'for',
  'on', 'with', 'that', 'this', 'these', 'those', 'as', 'by', 'an', 'be',
  'been', 'being', 'from', 'at', 'or', 'which', 'we', 'our', 'their', 'its',
  'it', 'has', 'have', 'had', 'not', 'no', 'but', 'if', 'than', 'then',
  'also', 'can', 'may', 'might', 'will', 'would', 'should', 'could', 'do',
  'does', 'did', 'into', 'more', 'most', 'other', 'such', 'only', 'own',
  'same', 'so', 'both', 'each', 'few', 'all', 'any', 'over', 'under',
  'again', 'further', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'what', 'who', 'whom', 'about', 'between', 'during', 'after',
  'before', 'above', 'below', 'up', 'down', 'out', 'off', 'through',
  'study', 'studies', 'using', 'used', 'based',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 3 && !STOPWORDS.has(tok))
}

export interface Vocabulary {
  termToIndex: Map<string, number>
  /** Document frequency per term, parallel to its index. */
  documentFrequency: number[]
  documentCount: number
}

/** Keeps the `maxSize` terms with the highest document frequency — a small,
 * simple cap that keeps training fast in a browser (no worker, no WASM)
 * without needing a more elaborate feature-selection method for an MVP. */
export function buildVocabulary(documents: string[], maxSize: number): Vocabulary {
  const documentFrequency = new Map<string, number>()
  for (const doc of documents) {
    const seen = new Set(tokenize(doc))
    for (const term of seen) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1)
  }

  const sorted = [...documentFrequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxSize)
  const termToIndex = new Map<string, number>()
  const df: number[] = []
  sorted.forEach(([term, count], index) => {
    termToIndex.set(term, index)
    df.push(count)
  })

  return { termToIndex, documentFrequency: df, documentCount: documents.length }
}

/** Sparse (term-index -> weight) vector — most of a document's terms are
 * absent from any given document, so this avoids ever allocating a
 * vocabSize-length array per document. Smoothed idf (`+1` inside and
 * outside the log), same convention as scikit-learn's default. */
export function vectorize(document: string, vocab: Vocabulary): Map<number, number> {
  const tokens = tokenize(document)
  if (tokens.length === 0) return new Map()

  const termCounts = new Map<string, number>()
  for (const term of tokens) termCounts.set(term, (termCounts.get(term) ?? 0) + 1)

  const vector = new Map<number, number>()
  for (const [term, count] of termCounts) {
    const index = vocab.termToIndex.get(term)
    if (index === undefined) continue
    const tf = count / tokens.length
    const idf = Math.log((vocab.documentCount + 1) / (vocab.documentFrequency[index] + 1)) + 1
    vector.set(index, tf * idf)
  }
  return vector
}
