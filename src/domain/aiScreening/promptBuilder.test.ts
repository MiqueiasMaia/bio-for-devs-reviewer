import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, buildUserMessage } from './promptBuilder'

describe('buildSystemPrompt', () => {
  it('includes only the project-provided criteria and reasons, nothing hardcoded', () => {
    const prompt = buildSystemPrompt(
      [
        { kind: 'inclusion', text: 'Adults with condition X', picotsDimension: 'P' },
        { kind: 'exclusion', text: 'Not a primary study', picotsDimension: null },
      ],
      [{ code: 'wrong_population', label: 'População errada' }],
    )
    expect(prompt).toContain('Adults with condition X')
    expect(prompt).toContain('[PICOTS: P]')
    expect(prompt).toContain('Not a primary study')
    expect(prompt).toContain('wrong_population: População errada')
    // Guard against regressions that reintroduce topic-specific hardcoding.
    expect(prompt.toLowerCase()).not.toContain('stroke')
    expect(prompt.toLowerCase()).not.toContain('machine learning')
  })

  it('renders a placeholder when a criteria group is empty', () => {
    const prompt = buildSystemPrompt([], [])
    expect(prompt).toContain('(none defined)')
  })
})

describe('buildUserMessage', () => {
  it('falls back to a title-only note when the abstract is missing', () => {
    const msg = buildUserMessage({ title: 'A Study', authors: 'Doe, J', abstract: null, year: 2021 })
    expect(msg).toContain('avalie apenas pelo título')
  })

  it('includes title, authors, year and abstract when present', () => {
    const msg = buildUserMessage({
      title: 'A Study',
      authors: 'Doe, J',
      abstract: 'Background: ...',
      year: 2021,
    })
    expect(msg).toContain('A Study')
    expect(msg).toContain('Doe, J')
    expect(msg).toContain('2021')
    expect(msg).toContain('Background: ...')
  })
})
