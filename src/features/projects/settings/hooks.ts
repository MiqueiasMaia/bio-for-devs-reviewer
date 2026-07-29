import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { CriterionKind, ExtractionFieldType, PicotsDimension, ProjectRole } from '@/types/domain'

const keys = {
  criteria: (projectId: string) => ['criteria', projectId] as const,
  highlightTerms: (projectId: string) => ['highlight_terms', projectId] as const,
  exclusionReasons: (projectId: string) => ['exclusion_reasons', projectId] as const,
  extractionFields: (projectId: string) => ['extraction_fields', projectId] as const,
  members: (projectId: string) => ['project_members', projectId] as const,
  invites: (projectId: string) => ['project_invites', projectId] as const,
}

// Criteria -----------------------------------------------------------------
export function useCriteria(projectId: string) {
  return useQuery({ queryKey: keys.criteria(projectId), queryFn: () => api.listCriteria(projectId) })
}

export function useCriteriaMutations(projectId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.criteria(projectId) })
  return {
    create: useMutation({
      mutationFn: (input: { kind: CriterionKind; text: string; orderIndex: number; picotsDimension: PicotsDimension | null }) =>
        api.createCriterion(projectId, input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (args: { id: string; patch: { text?: string; picotsDimension?: PicotsDimension | null } }) =>
        api.updateCriterion(args.id, args.patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.deleteCriterion(id),
      onSuccess: invalidate,
    }),
  }
}

// Highlight terms ---------------------------------------------------------
export function useHighlightTerms(projectId: string) {
  return useQuery({
    queryKey: keys.highlightTerms(projectId),
    queryFn: () => api.listHighlightTerms(projectId),
  })
}

export function useHighlightTermMutations(projectId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.highlightTerms(projectId) })
  return {
    create: useMutation({
      mutationFn: (input: { category: string; terms: string[]; color: string; orderIndex: number }) =>
        api.createHighlightTerm(projectId, input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (args: { id: string; patch: { category?: string; terms?: string[]; color?: string } }) =>
        api.updateHighlightTerm(args.id, args.patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.deleteHighlightTerm(id),
      onSuccess: invalidate,
    }),
  }
}

// Exclusion reasons -----------------------------------------------------
export function useExclusionReasons(projectId: string) {
  return useQuery({
    queryKey: keys.exclusionReasons(projectId),
    queryFn: () => api.listExclusionReasons(projectId),
  })
}

export function useExclusionReasonMutations(projectId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.exclusionReasons(projectId) })
  return {
    create: useMutation({
      mutationFn: (input: { code: string; label: string; orderIndex: number }) =>
        api.createExclusionReason(projectId, input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (args: { id: string; patch: { code?: string; label?: string } }) =>
        api.updateExclusionReason(args.id, args.patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.deleteExclusionReason(id),
      onSuccess: invalidate,
    }),
  }
}

// Extraction fields -----------------------------------------------------
export function useExtractionFields(projectId: string) {
  return useQuery({
    queryKey: keys.extractionFields(projectId),
    queryFn: () => api.listExtractionFields(projectId),
  })
}

export function useExtractionFieldMutations(projectId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.extractionFields(projectId) })
  return {
    create: useMutation({
      mutationFn: (input: {
        key: string
        label: string
        fieldType: ExtractionFieldType
        options: string[]
        required: boolean
        orderIndex: number
      }) => api.createExtractionField(projectId, input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (args: {
        id: string
        patch: { label?: string; fieldType?: ExtractionFieldType; options?: string[]; required?: boolean }
      }) => api.updateExtractionField(args.id, args.patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.deleteExtractionField(id),
      onSuccess: invalidate,
    }),
  }
}

// Members & invites -------------------------------------------------------
export function useMembers(projectId: string) {
  return useQuery({ queryKey: keys.members(projectId), queryFn: () => api.listMembers(projectId) })
}

export function useInvites(projectId: string) {
  return useQuery({ queryKey: keys.invites(projectId), queryFn: () => api.listInvites(projectId) })
}

export function useMemberMutations(projectId: string) {
  const qc = useQueryClient()
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: keys.members(projectId) })
    qc.invalidateQueries({ queryKey: keys.invites(projectId) })
  }
  return {
    invite: useMutation({
      mutationFn: (args: { email: string; role: ProjectRole; invitedBy: string }) =>
        api.inviteMember(projectId, args.email, args.role, args.invitedBy),
      onSuccess: invalidateAll,
    }),
    updateRole: useMutation({
      mutationFn: (args: { memberId: string; role: ProjectRole }) =>
        api.updateMemberRole(args.memberId, args.role),
      onSuccess: invalidateAll,
    }),
    remove: useMutation({
      mutationFn: (memberId: string) => api.removeMember(memberId),
      onSuccess: invalidateAll,
    }),
    cancelInvite: useMutation({
      mutationFn: (inviteId: string) => api.cancelInvite(inviteId),
      onSuccess: invalidateAll,
    }),
  }
}
