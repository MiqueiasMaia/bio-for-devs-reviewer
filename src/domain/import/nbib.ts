import type { ParsedRecord } from './types'

// PubMed MEDLINE (.nbib) tag line, e.g. "PMID- 25355680" or "TI  - Title".
// Tag occupies columns 1-4 (left-justified, space-padded), then "- ", then
// the value. Continuation lines are indented and never match this (they
// don't start with an uppercase tag at column 1).
const TAG_LINE = /^([A-Z]{2,4})\s*-\s(.*)$/

function extractYear(value: string | undefined): number | null {
  if (!value) return null
  const match = value.match(/\d{4}/)
  return match ? Number(match[0]) : null
}

function extractDoi(raw: Record<string, string[]>): string | null {
  const candidates = [...(raw.AID ?? []), ...(raw.LID ?? [])]
  for (const c of candidates) {
    const m = c.match(/^(.*?)\s*\[doi\]\s*$/i)
    if (m) return m[1].trim()
  }
  return null
}

function finalizeRecord(raw: Record<string, string[]>): ParsedRecord | null {
  if (Object.keys(raw).length === 0) return null

  const rawFlat: Record<string, unknown> = {}
  for (const [tag, values] of Object.entries(raw)) {
    rawFlat[tag] = values.length === 1 ? values[0] : values
  }

  const authors = raw.FAU?.length ? raw.FAU : (raw.AU ?? [])

  return {
    title: raw.TI?.[0] ?? '',
    authors: authors.join('; '),
    abstract: raw.AB?.[0] ?? null,
    year: extractYear(raw.DP?.[0]),
    doi: extractDoi(raw),
    pmid: raw.PMID?.[0] ?? null,
    journal: raw.JT?.[0] ?? raw.TA?.[0] ?? null,
    sourceDb: 'pubmed',
    raw: rawFlat,
  }
}

/**
 * Parses a PubMed MEDLINE (.nbib) export into ParsedRecord[]. Records are
 * separated by blank lines; FAU (full author name) is preferred over the
 * abbreviated AU when both are present; the DOI is recovered from the
 * AID/LID "... [doi]" tags.
 */
export function parseNbib(text: string): ParsedRecord[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const records: ParsedRecord[] = []

  let raw: Record<string, string[]> = {}
  let lastTag: string | null = null

  for (const line of lines) {
    if (line.trim() === '') {
      const record = finalizeRecord(raw)
      if (record) records.push(record)
      raw = {}
      lastTag = null
      continue
    }

    const match = line.match(TAG_LINE)
    if (match) {
      const tag = match[1]
      const value = match[2]
      raw[tag] = raw[tag] ? [...raw[tag], value] : [value]
      lastTag = tag
    } else if (lastTag && raw[lastTag]?.length) {
      const arr = raw[lastTag]
      arr[arr.length - 1] += ' ' + line.trim()
    }
  }

  const last = finalizeRecord(raw)
  if (last) records.push(last)

  return records
}
