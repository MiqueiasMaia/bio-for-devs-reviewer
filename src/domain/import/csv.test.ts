import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { guessCsvMapping, isLegacySchema, mapCsvRow, parseCsvRecords, parseCsvText } from './csv'

describe('parseCsvText', () => {
  it('parses headers and rows', () => {
    const { headers, rows } = parseCsvText('title,year\n"Hello, world",2020\n')
    expect(headers).toEqual(['title', 'year'])
    expect(rows).toEqual([{ title: 'Hello, world', year: '2020' }])
  })
})

describe('guessCsvMapping / mapCsvRow', () => {
  it('maps common header aliases case-insensitively', () => {
    const mapping = guessCsvMapping(['Title', 'Authors', 'Publication Year', 'DOI'])
    expect(mapping.title).toBe('Title')
    expect(mapping.authors).toBe('Authors')
    expect(mapping.year).toBe('Publication Year')
    expect(mapping.doi).toBe('DOI')
  })

  it('maps a row using the given mapping', () => {
    const mapping = guessCsvMapping(['Title', 'Year'])
    const record = mapCsvRow({ Title: 'Some study', Year: '2019' }, mapping)
    expect(record.title).toBe('Some study')
    expect(record.year).toBe(2019)
  })
})

describe('legacy schema', () => {
  const LEGACY_HEADERS = [
    'rec_id',
    'year',
    'title',
    'authors',
    'abstract',
    'doi',
    'ai',
    'in_shortlist',
    'in_sample',
    'source',
  ]

  it('recognizes the legacy header set', () => {
    expect(isLegacySchema(LEGACY_HEADERS)).toBe(true)
    expect(isLegacySchema(['title', 'authors'])).toBe(false)
  })

  it('maps source (source_db) rather than journal, and surfaces the ai decision', () => {
    const records = parseCsvRecords(
      'rec_id,year,title,authors,abstract,doi,ai,in_shortlist,in_sample,source\n' +
        'REC0001,2021,"A Title","Doe, J",Abstract text,10.1/x,INCLUDE,True,False,scopus\n',
    )
    expect(records).toHaveLength(1)
    expect(records[0].sourceDb).toBe('scopus')
    expect(records[0].journal).toBeNull()
    expect(records[0].aiDecision).toBe('INCLUDE')
  })

  it('imports the real 804-record legacy dataset without loss', () => {
    const csvPath = resolve(__dirname, '../../../legacy/fixtures/legacy_data_804.csv')
    const text = readFileSync(csvPath, 'utf-8')
    const records = parseCsvRecords(text)
    expect(records).toHaveLength(804)
    expect(records.every((r) => r.title.length > 0)).toBe(true)
    expect(records.filter((r) => r.aiDecision === 'INCLUDE').length).toBeGreaterThan(0)
  })
})
