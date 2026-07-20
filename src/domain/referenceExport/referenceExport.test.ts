import { describe, expect, it } from 'vitest'
import { buildBibtex, buildRis, type ReferenceRecord } from './referenceExport'

const RECORDS: ReferenceRecord[] = [
  {
    humanRef: 'REC0001',
    title: 'A Study of Things',
    authors: 'Doe, John; Smith, Jane',
    year: 2021,
    journal: 'Journal of Studies',
    doi: '10.1/example',
  },
]

describe('buildRis', () => {
  it('produces one TY..ER block per record with repeated AU tags', () => {
    const ris = buildRis(RECORDS)
    expect(ris).toContain('TY  - JOUR')
    expect(ris).toContain('AU  - Doe, John')
    expect(ris).toContain('AU  - Smith, Jane')
    expect(ris).toContain('TI  - A Study of Things')
    expect(ris).toContain('PY  - 2021')
    expect(ris).toContain('DO  - 10.1/example')
    expect(ris).toContain('ER  - ')
  })

  it('joins multiple records with a blank line', () => {
    const ris = buildRis([...RECORDS, { ...RECORDS[0], humanRef: 'REC0002' }])
    expect(ris.split('\n\n')).toHaveLength(2)
  })
})

describe('buildBibtex', () => {
  it('produces an @article entry with an author list joined by "and"', () => {
    const bib = buildBibtex(RECORDS)
    expect(bib).toContain('@article{')
    expect(bib).toContain('author = {Doe, John and Smith, Jane}')
    expect(bib).toContain('title = {A Study of Things}')
    expect(bib).toContain('year = {2021}')
    expect(bib).toContain('doi = {10.1/example}')
  })

  it('strips curly braces from field values to avoid breaking the entry', () => {
    const bib = buildBibtex([{ ...RECORDS[0], title: 'Weird {title}' }])
    expect(bib).toContain('title = {Weird title}')
  })
})
