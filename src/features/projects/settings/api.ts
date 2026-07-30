import { supabase } from '@/lib/supabase'
import type { CriterionKind, ExtractionFieldType, PicotsDimension, ProjectRole } from '@/types/domain'

// Criteria -----------------------------------------------------------------
export interface CriterionRow {
  id: string
  kind: CriterionKind
  text: string
  orderIndex: number
  picotsDimension: PicotsDimension | null
}

export async function listCriteria(projectId: string): Promise<CriterionRow[]> {
  const { data, error } = await supabase
    .from('criteria')
    .select('id, kind, text, order_index, picots_dimension')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data.map((r) => ({
    id: r.id,
    kind: r.kind,
    text: r.text,
    orderIndex: r.order_index,
    picotsDimension: r.picots_dimension,
  }))
}

export async function createCriterion(
  projectId: string,
  input: { kind: CriterionKind; text: string; orderIndex: number; picotsDimension: PicotsDimension | null },
): Promise<void> {
  const { error } = await supabase.from('criteria').insert({
    project_id: projectId,
    kind: input.kind,
    text: input.text,
    order_index: input.orderIndex,
    picots_dimension: input.picotsDimension,
  })
  if (error) throw error
}

export async function updateCriterion(
  id: string,
  patch: { text?: string; picotsDimension?: PicotsDimension | null },
): Promise<void> {
  const { error } = await supabase
    .from('criteria')
    .update({
      ...(patch.text !== undefined ? { text: patch.text } : {}),
      ...(patch.picotsDimension !== undefined ? { picots_dimension: patch.picotsDimension } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteCriterion(id: string): Promise<void> {
  const { error } = await supabase.from('criteria').delete().eq('id', id)
  if (error) throw error
}

// Highlight terms -------------------------------------------------------
export interface HighlightTermRow {
  id: string
  category: string
  terms: string[]
  color: string
  orderIndex: number
}

export async function listHighlightTerms(projectId: string): Promise<HighlightTermRow[]> {
  const { data, error } = await supabase
    .from('highlight_terms')
    .select('id, category, terms, color, order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data.map((r) => ({
    id: r.id,
    category: r.category,
    terms: r.terms,
    color: r.color,
    orderIndex: r.order_index,
  }))
}

export async function createHighlightTerm(
  projectId: string,
  input: { category: string; terms: string[]; color: string; orderIndex: number },
): Promise<void> {
  const { error } = await supabase.from('highlight_terms').insert({
    project_id: projectId,
    category: input.category,
    terms: input.terms,
    color: input.color,
    order_index: input.orderIndex,
  })
  if (error) throw error
}

export async function updateHighlightTerm(
  id: string,
  patch: { category?: string; terms?: string[]; color?: string },
): Promise<void> {
  const { error } = await supabase.from('highlight_terms').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteHighlightTerm(id: string): Promise<void> {
  const { error } = await supabase.from('highlight_terms').delete().eq('id', id)
  if (error) throw error
}

// Exclusion reasons -----------------------------------------------------
export interface ExclusionReasonRow {
  id: string
  code: string
  label: string
  orderIndex: number
}

export async function listExclusionReasons(projectId: string): Promise<ExclusionReasonRow[]> {
  const { data, error } = await supabase
    .from('exclusion_reasons')
    .select('id, code, label, order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data.map((r) => ({ id: r.id, code: r.code, label: r.label, orderIndex: r.order_index }))
}

export async function createExclusionReason(
  projectId: string,
  input: { code: string; label: string; orderIndex: number },
): Promise<void> {
  const { error } = await supabase.from('exclusion_reasons').insert({
    project_id: projectId,
    code: input.code,
    label: input.label,
    order_index: input.orderIndex,
  })
  if (error) throw error
}

export async function updateExclusionReason(
  id: string,
  patch: { code?: string; label?: string },
): Promise<void> {
  const { error } = await supabase.from('exclusion_reasons').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteExclusionReason(id: string): Promise<void> {
  const { error } = await supabase.from('exclusion_reasons').delete().eq('id', id)
  if (error) throw error
}

// Extraction fields ---------------------------------------------------------
export interface ExtractionFieldRow {
  id: string
  key: string
  label: string
  fieldType: ExtractionFieldType
  options: string[]
  required: boolean
  orderIndex: number
}

export async function listExtractionFields(projectId: string): Promise<ExtractionFieldRow[]> {
  const { data, error } = await supabase
    .from('extraction_fields')
    .select('id, key, label, field_type, options, required, order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    fieldType: r.field_type,
    options: r.options,
    required: r.required,
    orderIndex: r.order_index,
  }))
}

export async function createExtractionField(
  projectId: string,
  input: {
    key: string
    label: string
    fieldType: ExtractionFieldType
    options: string[]
    required: boolean
    orderIndex: number
  },
): Promise<void> {
  const { error } = await supabase.from('extraction_fields').insert({
    project_id: projectId,
    key: input.key,
    label: input.label,
    field_type: input.fieldType,
    options: input.options,
    required: input.required,
    order_index: input.orderIndex,
  })
  if (error) throw error
}

export async function updateExtractionField(
  id: string,
  patch: { label?: string; fieldType?: ExtractionFieldType; options?: string[]; required?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('extraction_fields')
    .update({
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.fieldType !== undefined ? { field_type: patch.fieldType } : {}),
      ...(patch.options !== undefined ? { options: patch.options } : {}),
      ...(patch.required !== undefined ? { required: patch.required } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteExtractionField(id: string): Promise<void> {
  const { error } = await supabase.from('extraction_fields').delete().eq('id', id)
  if (error) throw error
}

// Members & invites -------------------------------------------------------
export interface MemberRow {
  id: string
  userId: string
  displayName: string
  email: string
  initials: string
  role: ProjectRole
}

export interface InviteRow {
  id: string
  email: string
  role: ProjectRole
}

interface MemberQueryRow {
  id: string
  user_id: string
  role: ProjectRole
  profile: { display_name: string; email: string; initials: string } | null
}

export async function listMembers(projectId: string): Promise<MemberRow[]> {
  // See the .returns() note in features/projects/api.ts — Relationships
  // aren't declared in database.types.ts, so this embed's shape is pinned
  // explicitly rather than inferred.
  const { data, error } = await supabase
    .from('project_members')
    .select('id, user_id, role, profile:profiles(display_name, email, initials)')
    .eq('project_id', projectId)
    .returns<MemberQueryRow[]>()
  if (error) throw error
  return data.map((r) => ({
    id: r.id,
    userId: r.user_id,
    displayName: r.profile?.display_name ?? '',
    email: r.profile?.email ?? '',
    initials: r.profile?.initials ?? '',
    role: r.role,
  }))
}

export async function listInvites(projectId: string): Promise<InviteRow[]> {
  const { data, error } = await supabase
    .from('project_invites')
    .select('id, email, role')
    .eq('project_id', projectId)
  if (error) throw error
  return data.map((r) => ({ id: r.id, email: r.email, role: r.role }))
}

/**
 * Invites by email. If a profile with that email already exists, the person
 * is added to project_members immediately; otherwise a project_invites row
 * is stored and converted to membership automatically the first time they
 * sign up (see the handle_new_user trigger).
 */
export async function inviteMember(
  projectId: string,
  email: string,
  role: ProjectRole,
  invitedBy: string,
): Promise<'added' | 'invited'> {
  const { data: existingProfile, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (lookupError) throw lookupError

  if (existingProfile) {
    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: existingProfile.id, role })
    if (error) throw error
    return 'added'
  }

  const { error } = await supabase
    .from('project_invites')
    .insert({ project_id: projectId, email, role, invited_by: invitedBy })
  if (error) throw error
  return 'invited'
}

export async function updateMemberRole(memberId: string, role: ProjectRole): Promise<void> {
  const { error } = await supabase.from('project_members').update({ role }).eq('id', memberId)
  if (error) throw error
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('project_members').delete().eq('id', memberId)
  if (error) throw error
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('project_invites').delete().eq('id', inviteId)
  if (error) throw error
}
