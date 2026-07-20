import type { ParsedRecord } from './types'

// Matches a RIS tag line, e.g. "TY  - JOUR" or "AB  - Some abstract text".
// Tag: two letters/digits (first must be a letter). Loosely tolerant of
// 1-3 spaces before the dash, since real-world exports vary.
const TAG_LINE = /^([A-Z][A-Z0-9])\s{0,3}-\s?(.*)$/

const AUTHOR_TAGS = new Set(['AU', 'A1', 'A2', 'A3', 'A4'])
const TITLE_TAGS = ['TI', 'T1', 'TT']
const JOURNAL_TAGS = ['JO', 'JF', 'JA', 'T2']

function extractYear(value: string | undefined): number | null {
  if (!value) return null
  const match = value.match(/\d{4}/)
  return match ? Number(match[0]) : null
}

function firstOf(raw: Record<string, string[]>, tags: string[]): string | undefined {
  for (const tag of tags) {
    if (raw[tag]?.length) return raw[tag][0]
  }
  return undefined
}

function finalizeRecord(raw: Record<string, string[]>, authors: string[]): ParsedRecord | null {
  const title = firstOf(raw, TITLE_TAGS)
  if (!title && authors.length === 0 && Object.keys(raw).length === 0) return null

  const rawFlat: Record<string, unknown> = {}
  for (const [tag, values] of Object.entries(raw)) {
    rawFlat[tag] = values.length === 1 ? values[0] : values
  }
  if (authors.length) rawFlat.AU = authors

  return {
    title: title ?? '',
    authors: authors.join('; '),
    abstract: firstOf(raw, ['AB', 'N2']) ?? null,
    year: extractYear(firstOf(raw, ['PY', 'Y1', 'DA'])),
    doi: firstOf(raw, ['DO', 'DOI']) ?? null,
    pmid: firstOf(raw, ['AN', 'ID']) ?? null,
    journal: firstOf(raw, JOURNAL_TAGS) ?? null,
    sourceDb: firstOf(raw, ['DB']) ?? null,
    raw: rawFlat,
  }
}

/**
 * Parses a RIS (Research Information Systems) export into ParsedRecord[].
 * Handles multi-line field values (continuation lines with no tag of their
 * own) and repeated AU/A1 tags, and treats an ER line as the record
 * terminator per the RIS spec.
 */
export function parseRis(text: string): ParsedRecord[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const records: ParsedRecord[] = []

  let raw: Record<string, string[]> = {}
  let authors: string[] = []
  let lastTag: string | null = null

  const appendToLast = (tag: string, extra: string) => {
    if (AUTHOR_TAGS.has(tag)) {
      if (authors.length) authors[authors.length - 1] += ' ' + extra
      return
    }
    const arr = raw[tag]
    if (arr?.length) arr[arr.length - 1] += ' ' + extra
  }

  for (const line of lines) {
    if (line.trim() === '') continue
    const match = line.match(TAG_LINE)

    if (match) {
      const tag = match[1]
      const value = match[2]

      if (tag === 'ER') {
        const record = finalizeRecord(raw, authors)
        if (record) records.push(record)
        raw = {}
        authors = []
        lastTag = null
        continue
      }

      if (AUTHOR_TAGS.has(tag)) {
        authors.push(value)
      } else {
        raw[tag] = raw[tag] ? [...raw[tag], value] : [value]
      }
      lastTag = tag
    } else if (lastTag) {
      // Continuation line for the previous tag's value.
      appendToLast(lastTag, line.trim())
    }
  }

  // Tolerate a file missing a trailing ER for the last record.
  if (Object.keys(raw).length > 0 || authors.length > 0) {
    const record = finalizeRecord(raw, authors)
    if (record) records.push(record)
  }

  return records
}
