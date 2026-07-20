import { describe, expect, it } from 'vitest'
import { parseNbib } from './nbib'

const SAMPLE = `PMID- 25355680
OWN - NLM
STAT- MEDLINE
TI  - A deep learning approach to predicting
      motor recovery after stroke
DP  - 2014 Nov 22
AB  - Background: this study evaluates a model.
      Methods: retrospective cohort.
FAU - Smith, John A
AU  - Smith JA
FAU - Doe, Jane
AU  - Doe J
JT  - Lancet (London, England)
TA  - Lancet
AID - 10.1016/S0140-6736(14)61682-2 [doi]
LID - 10.1016/S0140-6736(14)61682-2 [doi]

PMID- 25355681
TI  - Second record
DP  - 2020 Jan
AU  - Lee K
TA  - Stroke
`

describe('parseNbib', () => {
  it('splits records on blank lines', () => {
    expect(parseNbib(SAMPLE)).toHaveLength(2)
  })

  it('joins continuation lines and prefers FAU over AU', () => {
    const [first] = parseNbib(SAMPLE)
    expect(first.title).toBe('A deep learning approach to predicting motor recovery after stroke')
    expect(first.authors).toBe('Smith, John A; Doe, Jane')
  })

  it('extracts pmid, year, journal and doi (stripping the [doi] suffix)', () => {
    const [first] = parseNbib(SAMPLE)
    expect(first.pmid).toBe('25355680')
    expect(first.year).toBe(2014)
    expect(first.journal).toBe('Lancet (London, England)')
    expect(first.doi).toBe('10.1016/S0140-6736(14)61682-2')
  })

  it('falls back to AU and TA when FAU/JT are absent', () => {
    const [, second] = parseNbib(SAMPLE)
    expect(second.authors).toBe('Lee K')
    expect(second.journal).toBe('Stroke')
  })
})
