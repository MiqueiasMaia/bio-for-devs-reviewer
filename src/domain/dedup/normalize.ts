export function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null
  let d = doi.trim().toLowerCase()
  d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
  d = d.replace(/^doi:\s*/, '')
  return d || null
}

export function normalizeTitle(title: string | null | undefined): string {
  if (!title) return ''
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}
