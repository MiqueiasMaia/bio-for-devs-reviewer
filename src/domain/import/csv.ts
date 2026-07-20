import Papa from 'papaparse'
import type { Decision } from '@/types/domain'
import type { ParsedRecord } from './types'

export interface CsvParseResult {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsvText(text: string): CsvParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })
  return { headers: result.meta.fields ?? [], rows: result.data }
}

export const CSV_TARGET_FIELDS = [
  'title',
  'authors',
  'abstract',
  'year',
  'doi',
  'pmid',
  'journal',
  'sourceDb',
] as const

export type CsvTargetField = (typeof CSV_TARGET_FIELDS)[number]
export type CsvFieldMapping = Partial<Record<CsvTargetField, string>>

const ALIASES: Record<CsvTargetField, string[]> = {
  title: ['title', 'ti', 'articletitle'],
  authors: ['authors', 'author', 'au'],
  abstract: ['abstract', 'ab', 'summary'],
  year: ['year', 'py', 'publicationyear', 'pubyear'],
  doi: ['doi'],
  pmid: ['pmid'],
  journal: ['journal', 'journalname', 'jo', 'jf', 'sourcetitle'],
  sourceDb: ['sourcedb', 'database', 'db'],
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Best-effort auto-mapping from CSV headers to our target fields, by alias. */
export function guessCsvMapping(headers: string[]): CsvFieldMapping {
  const mapping: CsvFieldMapping = {}
  for (const target of CSV_TARGET_FIELDS) {
    const found = headers.find((h) => ALIASES[target].includes(normalizeHeader(h)))
    if (found) mapping[target] = found
  }
  return mapping
}

export function mapCsvRow(row: Record<string, string>, mapping: CsvFieldMapping): ParsedRecord {
  const get = (key: CsvTargetField): string | undefined => {
    const header = mapping[key]
    const value = header ? row[header] : undefined
    return value?.trim() || undefined
  }
  const yearRaw = get('year')
  return {
    title: get('title') ?? '',
    authors: get('authors') ?? '',
    abstract: get('abstract') ?? null,
    year: yearRaw ? Number(yearRaw.match(/\d{4}/)?.[0] ?? yearRaw) : null,
    doi: get('doi') ?? null,
    pmid: get('pmid') ?? null,
    journal: get('journal') ?? null,
    sourceDb: get('sourceDb') ?? null,
    raw: { ...row },
  }
}

// Legacy schema ---------------------------------------------------------
// The original single-file screener exported/imported CSVs with this exact
// header set (see legacy/old-app.html and legacy/fixtures/legacy_data_804.csv):
//   rec_id, year, title, authors, abstract, doi, ai, in_shortlist, in_sample, source
// `source` there means the source database (e.g. "scopus"), and `ai` is a
// pre-computed AI screening decision — both handled specially so a straight
// alias-based mapping (which would misread `source` as "journal") can't be
// used for this format.
const LEGACY_REQUIRED_HEADERS = ['rec_id', 'title', 'authors', 'abstract', 'doi', 'source']

export function isLegacySchema(headers: string[]): boolean {
  const set = new Set(headers.map((h) => h.toLowerCase()))
  return LEGACY_REQUIRED_HEADERS.every((h) => set.has(h))
}

function normalizeDecision(value: string | undefined): Decision | undefined {
  const s = (value ?? '').trim().toUpperCase()
  return s === 'INCLUDE' || s === 'UNCERTAIN' || s === 'EXCLUDE' ? s : undefined
}

export function mapLegacyCsvRow(row: Record<string, string>): ParsedRecord {
  return {
    title: row.title?.trim() ?? '',
    authors: row.authors?.trim() ?? '',
    abstract: row.abstract?.trim() || null,
    year: row.year ? Number(row.year.match(/\d{4}/)?.[0] ?? row.year) : null,
    doi: row.doi?.trim() || null,
    pmid: null,
    journal: null,
    sourceDb: row.source?.trim() || null,
    raw: { ...row },
    aiDecision: normalizeDecision(row.ai),
  }
}

/**
 * Parses CSV text into ParsedRecord[]. Auto-detects the legacy screener
 * export schema; otherwise uses the given mapping (or a best-effort guess
 * from headers if no mapping is supplied).
 */
export function parseCsvRecords(text: string, mapping?: CsvFieldMapping): ParsedRecord[] {
  const { headers, rows } = parseCsvText(text)
  if (!mapping && isLegacySchema(headers)) {
    return rows.map(mapLegacyCsvRow)
  }
  const effectiveMapping = mapping ?? guessCsvMapping(headers)
  return rows.map((row) => mapCsvRow(row, effectiveMapping))
}
