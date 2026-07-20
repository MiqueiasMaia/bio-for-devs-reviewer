export interface RatingEntry {
  itemId: string
  raterId: string
  decision: string
}

export interface ConfusionMatrix {
  categories: string[]
  /** matrix[i][j] = count of items where rater A chose categories[i] and rater B chose categories[j]. */
  matrix: number[][]
}

export interface AgreementResult {
  kappa: number
  observedAgreement: number
  expectedAgreement: number
}

export function buildConfusionMatrix(
  ratingsA: string[],
  ratingsB: string[],
  categories: string[],
): ConfusionMatrix {
  const index = new Map(categories.map((c, i) => [c, i]))
  const matrix = categories.map(() => categories.map(() => 0))
  const n = Math.min(ratingsA.length, ratingsB.length)
  for (let i = 0; i < n; i++) {
    const a = index.get(ratingsA[i])
    const b = index.get(ratingsB[i])
    if (a === undefined || b === undefined) continue
    matrix[a][b]++
  }
  return { categories, matrix }
}

/**
 * Cohen's kappa for exactly two raters, from two decision arrays aligned by
 * item (ratingsA[i] and ratingsB[i] are the two ratings for the same item).
 */
export function cohenKappa(ratingsA: string[], ratingsB: string[], categories: string[]): AgreementResult {
  const { matrix } = buildConfusionMatrix(ratingsA, ratingsB, categories)
  const n = Math.min(ratingsA.length, ratingsB.length)
  if (n === 0) return { kappa: NaN, observedAgreement: NaN, expectedAgreement: NaN }

  let agree = 0
  for (let i = 0; i < categories.length; i++) agree += matrix[i][i]
  const po = agree / n

  const rowSums = matrix.map((row) => row.reduce((a, b) => a + b, 0))
  const colSums = categories.map((_, j) => matrix.reduce((sum, row) => sum + row[j], 0))
  let pe = 0
  for (let i = 0; i < categories.length; i++) pe += (rowSums[i] / n) * (colSums[i] / n)

  const kappa = pe === 1 ? 1 : (po - pe) / (1 - pe)
  return { kappa, observedAgreement: po, expectedAgreement: pe }
}

/**
 * Fleiss' kappa for a fixed number of raters per item (n ≥ 2, constant
 * across all rows). `matrix[i][j]` is how many of the n raters assigned
 * category j to item i. Use `buildFleissMatrix` to construct this from raw
 * (item, rater, decision) triples.
 */
export function fleissKappa(matrix: number[][]): AgreementResult {
  const N = matrix.length
  if (N === 0) return { kappa: NaN, observedAgreement: NaN, expectedAgreement: NaN }
  const n = matrix[0].reduce((a, b) => a + b, 0)
  const k = matrix[0].length
  if (n < 2) return { kappa: NaN, observedAgreement: NaN, expectedAgreement: NaN }

  const pj = new Array(k).fill(0)
  for (const row of matrix) for (let j = 0; j < k; j++) pj[j] += row[j]
  for (let j = 0; j < k; j++) pj[j] /= N * n

  const Pi = matrix.map((row) => {
    const sumSq = row.reduce((a, b) => a + b * b, 0)
    return (sumSq - n) / (n * (n - 1))
  })
  const Pbar = Pi.reduce((a, b) => a + b, 0) / N
  const PeBar = pj.reduce((a, b) => a + b * b, 0)

  const kappa = PeBar === 1 ? 1 : (Pbar - PeBar) / (1 - PeBar)
  return { kappa, observedAgreement: Pbar, expectedAgreement: PeBar }
}

/**
 * Groups raw (item, rater, decision) entries into the rating-count matrix
 * Fleiss' kappa needs. Only items rated by exactly `n` raters are included,
 * where `n` is the most common rater-count across items (so partially
 * screened records don't skew or break the computation) — the AI can be
 * passed in as just another rater entry (raterId "AI") to measure
 * human-vs-AI agreement the same way as inter-reviewer agreement.
 */
export function buildFleissMatrix(
  entries: RatingEntry[],
  categories: string[],
): { matrix: number[][]; n: number; itemIds: string[] } {
  const byItem = new Map<string, RatingEntry[]>()
  for (const e of entries) {
    const list = byItem.get(e.itemId) ?? []
    list.push(e)
    byItem.set(e.itemId, list)
  }
  const counts = [...byItem.values()].map((v) => v.length)
  if (counts.length === 0) return { matrix: [], n: 0, itemIds: [] }

  const freq = new Map<number, number>()
  for (const c of counts) freq.set(c, (freq.get(c) ?? 0) + 1)
  let n = counts[0]
  let best = -1
  for (const [c, f] of freq) {
    if (f > best) {
      best = f
      n = c
    }
  }

  const itemIds: string[] = []
  const matrix: number[][] = []
  for (const [itemId, list] of byItem) {
    if (list.length !== n) continue
    matrix.push(categories.map((cat) => list.filter((e) => e.decision === cat).length))
    itemIds.push(itemId)
  }
  return { matrix, n, itemIds }
}

/** Fraction of items where every rater chose the same category. */
export function percentAgreement(matrix: number[][]): number {
  const N = matrix.length
  if (N === 0) return NaN
  const n = matrix[0].reduce((a, b) => a + b, 0)
  const unanimous = matrix.filter((row) => Math.max(...row) === n).length
  return unanimous / N
}
