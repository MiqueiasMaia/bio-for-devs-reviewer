import type { Decision, ScreeningStage } from '@/types/domain'

export interface ScreeningDraft {
  /** null while the reviewer has only typed notes and not chosen a decision yet. */
  decision: Decision | null
  reasons: string[]
  notes: string
  savedAt: string
}

function draftKey(recordId: string, stage: ScreeningStage, reviewerId: string): string {
  return `screening_draft:${reviewerId}:${stage}:${recordId}`
}

/**
 * A localStorage safety net so a dropped connection never loses a decision:
 * every save writes here synchronously before the Supabase request goes
 * out, and the entry is cleared only once that request succeeds. On
 * mount/reconnect the screening workspace flushes any drafts still present
 * for the current queue.
 */
export function saveDraft(
  recordId: string,
  stage: ScreeningStage,
  reviewerId: string,
  draft: ScreeningDraft,
): void {
  try {
    localStorage.setItem(draftKey(recordId, stage, reviewerId), JSON.stringify(draft))
  } catch {
    // localStorage can throw (quota, private mode) — the Supabase write is
    // still attempted, this is best-effort resilience, not the only path.
  }
}

export function getDraft(recordId: string, stage: ScreeningStage, reviewerId: string): ScreeningDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(recordId, stage, reviewerId))
    return raw ? (JSON.parse(raw) as ScreeningDraft) : null
  } catch {
    return null
  }
}

export function clearDraft(recordId: string, stage: ScreeningStage, reviewerId: string): void {
  try {
    localStorage.removeItem(draftKey(recordId, stage, reviewerId))
  } catch {
    // ignore
  }
}

export function listDraftKeysForReviewer(stage: ScreeningStage, reviewerId: string): string[] {
  const prefix = `screening_draft:${reviewerId}:${stage}:`
  const keys: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
  } catch {
    // ignore
  }
  return keys
}

export function recordIdFromDraftKey(key: string): string {
  return key.split(':').slice(3).join(':')
}
