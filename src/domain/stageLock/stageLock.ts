import type { ProjectSettings, StageKey } from '@/types/domain'

export const STAGE_SEQUENCE: StageKey[] = ['title_abstract', 'full_text', 'conflicts', 'risk_of_bias', 'data_extraction']

type ApplicableSettings = Pick<ProjectSettings, 'stages_enabled' | 'risk_of_bias_enabled' | 'data_extraction_enabled'>

export function getApplicableStages(settings: ApplicableSettings): StageKey[] {
  return STAGE_SEQUENCE.filter((stage) => {
    if (stage === 'title_abstract' || stage === 'full_text') return settings.stages_enabled.includes(stage)
    if (stage === 'conflicts') return settings.stages_enabled.length > 0
    if (stage === 'risk_of_bias') return settings.risk_of_bias_enabled
    return settings.data_extraction_enabled
  })
}

export function getPreviousStage(stage: StageKey, applicable: StageKey[]): StageKey | null {
  const i = applicable.indexOf(stage)
  return i > 0 ? applicable[i - 1] : null
}

export function getNextStage(stage: StageKey, applicable: StageKey[]): StageKey | null {
  const i = applicable.indexOf(stage)
  return i < 0 || i === applicable.length - 1 ? null : applicable[i + 1]
}

/**
 * The first applicable stage is always unlocked even if `unlockedStages`
 * doesn't literally list it — defensive against rows saved before this
 * feature existed, or a project whose enabled-stage flags changed since the
 * unlocked_stages array was last reconciled.
 */
export function isStageUnlocked(stage: StageKey, unlockedStages: StageKey[], applicable: StageKey[]): boolean {
  return applicable[0] === stage || unlockedStages.includes(stage)
}

export function canUnlockStage(stage: StageKey, unlockedStages: StageKey[], applicable: StageKey[]): boolean {
  if (!applicable.includes(stage)) return false
  const previous = getPreviousStage(stage, applicable)
  return !previous || isStageUnlocked(previous, unlockedStages, applicable)
}

export function unlockStage(stage: StageKey, unlockedStages: StageKey[], applicable: StageKey[]): StageKey[] {
  if (!canUnlockStage(stage, unlockedStages, applicable) || unlockedStages.includes(stage)) return unlockedStages
  return [...unlockedStages, stage]
}

/**
 * Locking `stage` also re-locks every later applicable stage, so
 * `unlockedStages` stays a prefix of `applicable` — the invariant
 * `canUnlockStage` relies on. Locking the first applicable stage is a
 * no-op — nothing precedes it, so it can't be locked out.
 */
export function lockStage(stage: StageKey, unlockedStages: StageKey[], applicable: StageKey[]): StageKey[] {
  const i = applicable.indexOf(stage)
  if (i <= 0) return unlockedStages
  const keep = new Set(applicable.slice(0, i))
  return unlockedStages.filter((s) => keep.has(s))
}

/**
 * Repairs unlockedStages after stages_enabled / risk_of_bias_enabled /
 * data_extraction_enabled change: drops now-inapplicable stages and
 * guarantees the (possibly new) first applicable stage is present.
 */
export function reconcileUnlockedStages(unlockedStages: StageKey[], applicable: StageKey[]): StageKey[] {
  const applicableSet = new Set(applicable)
  const kept = unlockedStages.filter((s) => applicableSet.has(s))
  if (applicable.length > 0 && !kept.includes(applicable[0])) kept.unshift(applicable[0])
  return kept
}
