import { describe, expect, it } from 'vitest'
import {
  canUnlockStage,
  getApplicableStages,
  getNextStage,
  getPreviousStage,
  isStageUnlocked,
  lockStage,
  reconcileUnlockedStages,
  unlockStage,
} from './stageLock'
import type { ScreeningStage, StageKey } from '@/types/domain'

const allStagesSettings = {
  stages_enabled: ['title_abstract', 'full_text'] as ScreeningStage[],
  risk_of_bias_enabled: true,
  data_extraction_enabled: true,
}

describe('getApplicableStages', () => {
  it('includes every stage when all flags are on', () => {
    expect(getApplicableStages(allStagesSettings)).toEqual([
      'title_abstract',
      'full_text',
      'conflicts',
      'risk_of_bias',
      'data_extraction',
    ])
  })

  it('drops title_abstract/full_text/risk_of_bias/data_extraction when disabled, but keeps conflicts', () => {
    expect(
      getApplicableStages({
        stages_enabled: ['full_text'],
        risk_of_bias_enabled: false,
        data_extraction_enabled: false,
      }),
    ).toEqual(['full_text', 'conflicts'])
  })

  it('has no applicable stages when stages_enabled is empty and no other flags are on', () => {
    // conflicts only makes sense once some screening stage can produce
    // decisions to conflict over — an empty stages_enabled means nothing
    // has ever been enabled for this project.
    expect(
      getApplicableStages({ stages_enabled: [], risk_of_bias_enabled: false, data_extraction_enabled: false }),
    ).toEqual([])
  })
})

describe('getPreviousStage / getNextStage', () => {
  const applicable: StageKey[] = ['title_abstract', 'full_text', 'conflicts', 'risk_of_bias', 'data_extraction']

  it('walks the sequence forward and backward', () => {
    expect(getPreviousStage('full_text', applicable)).toBe('title_abstract')
    expect(getNextStage('full_text', applicable)).toBe('conflicts')
  })

  it('returns null at the boundaries', () => {
    expect(getPreviousStage('title_abstract', applicable)).toBeNull()
    expect(getNextStage('data_extraction', applicable)).toBeNull()
  })

  it('returns null for a stage that is not applicable', () => {
    const withoutRob: StageKey[] = ['title_abstract', 'full_text', 'conflicts', 'data_extraction']
    expect(getPreviousStage('risk_of_bias', withoutRob)).toBeNull()
    expect(getNextStage('risk_of_bias', withoutRob)).toBeNull()
  })
})

describe('isStageUnlocked', () => {
  const applicable: StageKey[] = ['title_abstract', 'full_text', 'conflicts']

  it('treats the first applicable stage as always unlocked, even if not listed', () => {
    expect(isStageUnlocked('title_abstract', [], applicable)).toBe(true)
  })

  it('treats a later stage as locked unless explicitly listed', () => {
    expect(isStageUnlocked('full_text', ['title_abstract'], applicable)).toBe(false)
    expect(isStageUnlocked('full_text', ['title_abstract', 'full_text'], applicable)).toBe(true)
  })
})

describe('canUnlockStage / unlockStage', () => {
  const applicable: StageKey[] = ['title_abstract', 'full_text', 'conflicts']

  it('allows unlocking the next stage once its predecessor is unlocked', () => {
    expect(canUnlockStage('full_text', ['title_abstract'], applicable)).toBe(true)
    expect(unlockStage('full_text', ['title_abstract'], applicable)).toEqual(['title_abstract', 'full_text'])
  })

  it('refuses to unlock a stage whose predecessor is still locked', () => {
    expect(canUnlockStage('conflicts', ['title_abstract'], applicable)).toBe(false)
    expect(unlockStage('conflicts', ['title_abstract'], applicable)).toEqual(['title_abstract'])
  })

  it('refuses to unlock a stage that is not applicable to this project', () => {
    expect(canUnlockStage('risk_of_bias', ['title_abstract', 'full_text', 'conflicts'], applicable)).toBe(false)
  })

  it('is a no-op when the stage is already unlocked', () => {
    const unlocked: StageKey[] = ['title_abstract', 'full_text']
    expect(unlockStage('full_text', unlocked, applicable)).toBe(unlocked)
  })
})

describe('lockStage', () => {
  const applicable: StageKey[] = ['title_abstract', 'full_text', 'conflicts', 'risk_of_bias', 'data_extraction']

  it('cascades: locking a middle stage re-locks everything after it too', () => {
    const unlocked: StageKey[] = ['title_abstract', 'full_text', 'conflicts', 'risk_of_bias', 'data_extraction']
    expect(lockStage('conflicts', unlocked, applicable)).toEqual(['title_abstract', 'full_text'])
  })

  it('is a no-op when locking the first applicable stage', () => {
    const unlocked: StageKey[] = ['title_abstract', 'full_text']
    expect(lockStage('title_abstract', unlocked, applicable)).toBe(unlocked)
  })
})

describe('reconcileUnlockedStages', () => {
  it('drops stages that are no longer applicable', () => {
    const applicable: StageKey[] = ['title_abstract', 'conflicts']
    expect(reconcileUnlockedStages(['title_abstract', 'full_text', 'conflicts'], applicable)).toEqual([
      'title_abstract',
      'conflicts',
    ])
  })

  it('promotes the new first applicable stage if it was not previously listed', () => {
    const applicable: StageKey[] = ['full_text', 'conflicts']
    expect(reconcileUnlockedStages(['title_abstract'], applicable)).toEqual(['full_text'])
  })
})
