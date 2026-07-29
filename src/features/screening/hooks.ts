import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Decision, ScreeningStage } from '@/types/domain'
import * as api from './api'
import { clearDraft, getDraft, listDraftKeysForReviewer, recordIdFromDraftKey, saveDraft } from './localDraftStore'

/** Notes typed before any decision exists have nowhere to go server-side
 * yet (screenings.decision is NOT NULL) — they're kept as a local-only
 * draft until a decision is made, at which point useSaveScreening persists
 * both together. */
export function saveNotesOnlyDraft(recordId: string, stage: ScreeningStage, reviewerId: string, notes: string) {
  saveDraft(recordId, stage, reviewerId, { decision: null, reasons: [], notes, savedAt: new Date().toISOString() })
}

const queueKey = (projectId: string, stage: ScreeningStage, reviewerId: string) =>
  ['screening_queue', projectId, stage, reviewerId] as const
const myScreeningsKey = (projectId: string, stage: ScreeningStage, reviewerId: string) =>
  ['my_screenings', projectId, stage, reviewerId] as const
const summaryKey = (projectId: string, stage: ScreeningStage, reviewerId: string) =>
  ['screening_summary', projectId, stage, reviewerId] as const

export function useQueue(projectId: string, stage: ScreeningStage, reviewerId: string, reviewersRequired: number) {
  return useQuery({
    queryKey: queueKey(projectId, stage, reviewerId),
    queryFn: () => api.fetchQueue(projectId, stage, reviewerId, reviewersRequired),
  })
}

export function useMyScreenings(projectId: string, stage: ScreeningStage, reviewerId: string) {
  return useQuery({
    queryKey: myScreeningsKey(projectId, stage, reviewerId),
    queryFn: () => api.fetchMyScreenings(reviewerId, stage),
  })
}

export function useQueueSummary(projectId: string, stage: ScreeningStage, reviewerId: string) {
  return useQuery({
    queryKey: summaryKey(projectId, stage, reviewerId),
    queryFn: () => api.fetchQueueSummary(projectId, stage, reviewerId),
  })
}

export function useAiMatchForStage(projectId: string, stage: ScreeningStage, enabled: boolean) {
  return useQuery({
    queryKey: ['ai_match_for_stage', projectId, stage],
    queryFn: () => api.fetchAiMatchForStage(projectId, stage),
    enabled,
  })
}

export function useProjectDecisionCounts(projectId: string, stage: ScreeningStage) {
  return useQuery({
    queryKey: ['project_decision_counts', projectId, stage],
    queryFn: () => api.fetchProjectDecisionCounts(projectId, stage),
  })
}

export function useSaveScreening(projectId: string, stage: ScreeningStage, reviewerId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { recordId: string; decision: Decision; reasons: string[]; notes: string }) => {
      saveDraft(input.recordId, stage, reviewerId, {
        decision: input.decision,
        reasons: input.reasons,
        notes: input.notes,
        savedAt: new Date().toISOString(),
      })
      await api.saveScreening({ ...input, reviewerId, stage })
      clearDraft(input.recordId, stage, reviewerId)
    },
    onSuccess: () => {
      // Deliberately NOT invalidating the queue here. fetchQueue excludes
      // any record this reviewer has already screened, so invalidating it
      // on every save yanks the record the reviewer is *currently looking
      // at* out of the list mid-edit — e.g. marking EXCLUDE, then having
      // the exclusion-reasons panel vanish before there's time to click a
      // reason, because the list just reloaded without that record and the
      // same numeric index now points at whatever used to be next. The
      // queue re-syncs on its own via normal cache staleness (or a
      // stage/filter change, or revisiting the page) — that's fine, it
      // doesn't need to shrink instantly under the reviewer's cursor.
      qc.invalidateQueries({ queryKey: myScreeningsKey(projectId, stage, reviewerId) })
      qc.invalidateQueries({ queryKey: summaryKey(projectId, stage, reviewerId) })
    },
  })
}

/**
 * On mount (and whenever the queue changes), retries any localStorage
 * drafts left over from a previous save that failed to reach Supabase —
 * e.g. the connection dropped right after the optimistic local write.
 */
export function useReconcileDrafts(stage: ScreeningStage, reviewerId: string, saveScreening: ReturnType<typeof useSaveScreening>) {
  useEffect(() => {
    const keys = listDraftKeysForReviewer(stage, reviewerId)
    for (const key of keys) {
      const recordId = recordIdFromDraftKey(key)
      const draft = getDraft(recordId, stage, reviewerId)
      if (draft?.decision) {
        saveScreening.mutate({ recordId, decision: draft.decision, reasons: draft.reasons, notes: draft.notes })
      }
    }
    // Runs once per mount; the draft store itself is the source of truth
    // for "is there unsynced work", not a dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
