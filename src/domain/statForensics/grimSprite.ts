/**
 * GRIM/SPRITE-style statistical forensics — checks whether a reported
 * mean/SD are even mathematically achievable given the sample size (and,
 * for SD, a bounded integer scale), a known signal of possible reporting
 * error or fabrication (Brown & Heathers 2017; Heathers et al.'s SPRITE).
 * Pure math over already-extracted numbers — no network, no side effects.
 * This never blocks inclusion; it only produces a flag for the reviewer,
 * per docs/pending-items.md §7.2.
 */

export interface GrimCheckInput {
  /** Reported mean exactly as extracted (a string, so its decimal
   * precision — which GRIM's math depends on — survives intact; `3.860`
   * and `3.86` are not the same claim). */
  mean: string
  n: number
}

export interface GrimCheckResult {
  consistent: boolean
  /** The closest mean actually reachable by an integer sum over `n` cases,
   * rounded to the same number of decimals as the reported mean. */
  nearestPossibleMean: number
}

const DECIMAL_NUMBER = /^-?\d+(\.\d+)?$/

/** Is there an integer sum over `n` cases whose mean, rounded to the
 * reported precision, equals the reported mean? If not, the mean is
 * "GRIM-inconsistent" — impossible for integer/whole-unit data (Likert
 * items, counts, ordinal scales), which covers most extracted outcomes. */
export function checkGrim({ mean, n }: GrimCheckInput): GrimCheckResult | null {
  if (!Number.isInteger(n) || n <= 0) return null
  const trimmed = mean.trim()
  if (!DECIMAL_NUMBER.test(trimmed)) return null

  const decimals = (trimmed.split('.')[1] ?? '').length
  const meanValue = Number(trimmed)
  const scale = 10 ** decimals
  const rawSum = meanValue * n

  // The nearest achievable sum is either floor or ceil of the raw
  // (possibly fractional) target sum — never anything further away, so
  // checking just these two candidates is exhaustive, not a heuristic.
  const candidateSums = [...new Set([Math.floor(rawSum), Math.ceil(rawSum)])]
  let best: GrimCheckResult = { consistent: false, nearestPossibleMean: meanValue }
  let bestDiff = Infinity
  for (const sum of candidateSums) {
    const candidateMean = Math.round((sum / n) * scale) / scale
    const diff = Math.abs(candidateMean - meanValue)
    if (diff < bestDiff) {
      bestDiff = diff
      best = { consistent: diff < 1e-9, nearestPossibleMean: candidateMean }
    }
  }
  return best
}

export interface SdRangeInput {
  n: number
  /** Integer sum consistent with the reported (or nearest achievable) mean. */
  sum: number
  min: number
  max: number
}

export interface SdRangeResult {
  minSd: number
  maxSd: number
}

/** The narrowest and widest standard deviation achievable by any set of
 * `n` integers in `[min, max]` summing to exactly `sum`. A reported SD
 * outside this range is impossible for that mean/N/scale combination —
 * the SPRITE-style bounds check (a closed-form pre-check, not the full
 * iterative SPRITE search, which additionally enumerates whole candidate
 * datasets; this is the fast feasibility test SPRITE itself starts from).
 *
 * Minimum variance: values packed as tightly as possible around the mean
 * (`q` and `q+1`, `q = floor(sum/n)`) — the classic result that this
 * variance equals `r(n-r)/n²` where `r = sum mod n`, independent of the
 * bounds (the tightest possible cluster is always within any bounds wide
 * enough to contain the mean itself).
 *
 * Maximum variance: sum-of-squares is convex, so maximizing it subject to
 * a fixed sum and box constraints puts every value at a bound except at
 * most one "remainder" value — tried here for every split `k` values at
 * `max` / `n-k-1` at `min` / 1 interior value, keeping the best.
 */
export function computeSdFeasibleRange({ n, sum, min, max }: SdRangeInput): SdRangeResult {
  const mean = sum / n

  const q = Math.floor(sum / n)
  const r = sum - n * q
  const minVariance = (r * (n - r)) / (n * n)

  let maxVariance = 0
  for (let k = 0; k < n; k++) {
    const rest = n - k - 1
    const interior = sum - k * max - rest * min
    if (interior < min || interior > max) continue
    const sumOfSquares = k * max * max + rest * min * min + interior * interior
    const variance = sumOfSquares / n - mean * mean
    if (variance > maxVariance) maxVariance = variance
  }

  return { minSd: Math.sqrt(Math.max(minVariance, 0)), maxSd: Math.sqrt(Math.max(maxVariance, 0)) }
}

export interface StatForensicsInput {
  mean?: string | null
  sd?: string | null
  n?: string | null
  min?: string | null
  max?: string | null
}

export interface StatForensicsResult {
  grim: GrimCheckResult | null
  sdRange: (SdRangeResult & { sd: number; consistent: boolean }) | null
  hasWarning: boolean
}

function parseFinite(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/** Runs whichever checks the available fields support: GRIM needs just
 * mean+N (the common case); the SD feasibility check additionally needs
 * SD and the scale's min/max, which not every project extracts — those
 * are simply skipped rather than treated as a failure. */
export function runStatForensics(input: StatForensicsInput): StatForensicsResult {
  const n = parseFinite(input.n)
  const meanStr = input.mean?.trim()
  const meanValue = meanStr ? parseFinite(meanStr) : null
  const validN = n !== null && Number.isInteger(n) && n > 0

  const grim = validN && meanStr ? checkGrim({ mean: meanStr, n }) : null

  let sdRange: StatForensicsResult['sdRange'] = null
  const sd = parseFinite(input.sd)
  const min = parseFinite(input.min)
  const max = parseFinite(input.max)
  if (
    validN &&
    meanValue !== null &&
    sd !== null &&
    min !== null &&
    max !== null &&
    min < max &&
    meanValue >= min &&
    meanValue <= max
  ) {
    const sum = Math.round(meanValue * n)
    const range = computeSdFeasibleRange({ n, sum, min, max })
    const tolerance = 1e-6
    const consistent = sd >= range.minSd - tolerance && sd <= range.maxSd + tolerance
    sdRange = { ...range, sd, consistent }
  }

  const hasWarning = (grim !== null && !grim.consistent) || (sdRange !== null && !sdRange.consistent)
  return { grim, sdRange, hasWarning }
}
