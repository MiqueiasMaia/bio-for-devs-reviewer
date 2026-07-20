/** Classic Jaro similarity, in [0, 1]. */
export function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const len1 = s1.length
  const len2 = s2.length
  if (len1 === 0 || len2 === 0) return 0

  const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1)
  const s1Matches = new Array<boolean>(len1).fill(false)
  const s2Matches = new Array<boolean>(len2).fill(false)

  let matches = 0
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, len2)
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0

  let transpositions = 0
  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }
  transpositions = transpositions / 2

  return (matches / len1 + matches / len2 + (matches - transpositions) / matches) / 3
}

/**
 * Jaro-Winkler similarity: the Jaro score boosted for strings that share a
 * common prefix (up to 4 characters), which suits bibliographic titles well
 * since near-duplicate titles usually diverge only near the end (subtitle,
 * punctuation) rather than at the start.
 */
export function jaroWinklerSimilarity(s1: string, s2: string, prefixScale = 0.1): number {
  const jaro = jaroSimilarity(s1, s2)
  const maxPrefix = 4
  let prefixLength = 0
  for (let i = 0; i < Math.min(maxPrefix, s1.length, s2.length); i++) {
    if (s1[i] !== s2[i]) break
    prefixLength++
  }
  return jaro + prefixLength * prefixScale * (1 - jaro)
}
