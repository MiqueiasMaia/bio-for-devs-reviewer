import type { ScreeningStage } from '@/types/domain'

/**
 * Pure client-side "pick up where I left off" + daily micro-goal —
 * localStorage only, same try/catch resilience convention as
 * localDraftStore.ts. Deliberately not synced to the backend: this is a
 * personal pacing aid, not something the review methodology depends on or
 * reports on (no session/time tracking in the data model, by design).
 */

function positionKey(reviewerId: string, stage: ScreeningStage, projectId: string): string {
  return `screening_last_position:${reviewerId}:${stage}:${projectId}`
}

export function saveLastPosition(
  reviewerId: string,
  stage: ScreeningStage,
  projectId: string,
  recordId: string,
): void {
  try {
    localStorage.setItem(positionKey(reviewerId, stage, projectId), recordId)
  } catch {
    // best-effort only
  }
}

export function getLastPosition(reviewerId: string, stage: ScreeningStage, projectId: string): string | null {
  try {
    return localStorage.getItem(positionKey(reviewerId, stage, projectId))
  } catch {
    return null
  }
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function goalKey(reviewerId: string, stage: ScreeningStage, projectId: string): string {
  // The date is baked into the key itself, so a new day's goal starts
  // fresh automatically — no expiry logic needed.
  return `screening_daily_goal:${reviewerId}:${stage}:${projectId}:${todayStamp()}`
}

export function getDailyGoal(reviewerId: string, stage: ScreeningStage, projectId: string): number | null {
  try {
    const raw = localStorage.getItem(goalKey(reviewerId, stage, projectId))
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function setDailyGoal(reviewerId: string, stage: ScreeningStage, projectId: string, goal: number): void {
  try {
    localStorage.setItem(goalKey(reviewerId, stage, projectId), String(goal))
  } catch {
    // best-effort only
  }
}
