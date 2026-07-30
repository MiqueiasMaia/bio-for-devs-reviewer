export interface RescreenInfo {
  rescreenCount: number
  updatedAt: string
}

/** Strict round-robin ordering for batch reprocessing: never-screened
 * records (count 0) first, then lowest rescreen_count first, tie-broken by
 * oldest updated_at. Guarantees a record can only reach count N+1 once
 * every other record in the set has already reached N — the globally
 * lowest-count records always sort first and get exhausted before a
 * higher-count one is ever returned. */
export function orderForRescreening(recordIds: string[], infoById: Map<string, RescreenInfo>): string[] {
  return [...recordIds].sort((a, b) => {
    const aInfo = infoById.get(a)
    const bInfo = infoById.get(b)
    const aCount = aInfo?.rescreenCount ?? 0
    const bCount = bInfo?.rescreenCount ?? 0
    if (aCount !== bCount) return aCount - bCount
    if (!aInfo && !bInfo) return 0
    if (!aInfo) return -1
    if (!bInfo) return 1
    return aInfo.updatedAt.localeCompare(bInfo.updatedAt)
  })
}
