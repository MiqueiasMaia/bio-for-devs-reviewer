import { describe, expect, it } from 'vitest'
import { BACKUP_SCHEMA_VERSION, isValidProjectBackup, type ProjectBackup } from './schema'

const validBackup: ProjectBackup = {
  schemaVersion: BACKUP_SCHEMA_VERSION,
  exportedAt: '2026-01-01T00:00:00.000Z',
  project: {
    name: 'Demo',
    description: '',
    prosperoId: null,
    settings: {
      reviewers_required_per_record: 2,
      blind_screening: true,
      auto_advance_on_decision: true,
      stages_enabled: ['title_abstract'],
      dedup: { on_doi: true, on_normalized_title: true, title_similarity_threshold: 0.92 },
      ui_locale: 'pt-BR',
      ai_screening_enabled: false,
      ai_counts_as_reviewer: false,
      risk_of_bias_enabled: false,
      data_extraction_enabled: false,
      unlocked_stages: ['title_abstract'],
    },
  },
  criteria: [],
  highlightTerms: [],
  exclusionReasons: [],
  records: [],
  screenings: [],
  resolutions: [],
  aiScreenings: [],
}

describe('isValidProjectBackup', () => {
  it('accepts a well-formed backup object', () => {
    expect(isValidProjectBackup(validBackup)).toBe(true)
  })

  it('rejects null, arrays, and primitives', () => {
    expect(isValidProjectBackup(null)).toBe(false)
    expect(isValidProjectBackup([])).toBe(false)
    expect(isValidProjectBackup('backup')).toBe(false)
  })

  it('rejects an object missing required arrays', () => {
    const { records: _records, ...rest } = validBackup
    expect(isValidProjectBackup(rest)).toBe(false)
  })
})
