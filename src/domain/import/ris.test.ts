import { describe, expect, it } from 'vitest'
import { parseRis } from './ris'

const SAMPLE = `TY  - JOUR
AU  - Smith, John A.
AU  - Doe, Jane
TI  - A machine learning model for stroke
      outcome prediction
PY  - 2021
AB  - This is a long abstract that
      spans multiple lines in the file.
DO  - 10.1016/j.example.2021.01.001
JO  - Journal of Stroke Research
DB  - Scopus
ER  -

TY  - JOUR
AU  - Lee, Kim
TI  - Second study without abstract
PY  - 2019/03/15
DO  - 10.1000/second
ER  -
`

describe('parseRis', () => {
  it('parses multiple records separated by ER', () => {
    const records = parseRis(SAMPLE)
    expect(records).toHaveLength(2)
  })

  it('joins continuation lines into the previous field', () => {
    const [first] = parseRis(SAMPLE)
    expect(first.title).toBe('A machine learning model for stroke outcome prediction')
    expect(first.abstract).toBe('This is a long abstract that spans multiple lines in the file.')
  })

  it('joins repeated AU tags with a semicolon', () => {
    const [first] = parseRis(SAMPLE)
    expect(first.authors).toBe('Smith, John A.; Doe, Jane')
  })

  it('extracts doi, journal, source db and a 4-digit year from any date format', () => {
    const [first, second] = parseRis(SAMPLE)
    expect(first.doi).toBe('10.1016/j.example.2021.01.001')
    expect(first.journal).toBe('Journal of Stroke Research')
    expect(first.sourceDb).toBe('Scopus')
    expect(first.year).toBe(2021)
    expect(second.year).toBe(2019)
  })

  it('tolerates a missing trailing ER on the last record', () => {
    const text = 'TY  - JOUR\nTI  - No terminator\nPY  - 2020\n'
    const records = parseRis(text)
    expect(records).toHaveLength(1)
    expect(records[0].title).toBe('No terminator')
  })

  it('returns an empty array for empty input', () => {
    expect(parseRis('')).toEqual([])
  })
})
