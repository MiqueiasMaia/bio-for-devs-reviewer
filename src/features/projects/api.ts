import { supabase } from '@/lib/supabase'
import type { ProjectRole, ProjectSettings, ScreeningStage } from '@/types/domain'

export interface ProjectSummary {
  id: string
  name: string
  description: string
  prosperoId: string | null
  role: ProjectRole
  createdAt: string
  counts: {
    identified: number
    screened: number
    included: number
  }
}

export interface ProjectDetail {
  id: string
  name: string
  description: string
  prosperoId: string | null
  ownerId: string
  settings: ProjectSettings
  createdAt: string
  archivedAt: string | null
}

interface ProjectWithRoleRow {
  id: string
  name: string
  description: string
  prospero_id: string | null
  created_at: string
  project_members: { role: ProjectRole }[]
}

export async function listMyProjects(
  userId: string,
  options?: { archived?: boolean },
): Promise<ProjectSummary[]> {
  const archived = options?.archived ?? false
  // Relationships aren't declared in database.types.ts (see the comment
  // there), so the embed's row shape is pinned explicitly with .returns()
  // rather than relying on supabase-js to infer it from FK metadata.
  let query = supabase
    .from('projects')
    .select('id, name, description, prospero_id, created_at, project_members!inner(role)')
    .eq('project_members.user_id', userId)
  query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)
  const { data: rows, error } = await query
    .order('created_at', { ascending: false })
    .returns<ProjectWithRoleRow[]>()

  if (error) throw error

  const projectIds = rows.map((r) => r.id)
  const countsById = new Map<string, ProjectSummary['counts']>()

  if (projectIds.length > 0) {
    const { data: counts, error: countsError } = await supabase
      .from('v_prisma_counts')
      .select('project_id, records_screened_ta, fulltext_sought, included_final')
      .in('project_id', projectIds)
    if (countsError) throw countsError
    for (const c of counts) {
      countsById.set(c.project_id, {
        identified: c.records_screened_ta,
        screened: c.fulltext_sought,
        included: c.included_final,
      })
    }
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    prosperoId: r.prospero_id,
    role: r.project_members[0]?.role ?? 'viewer',
    createdAt: r.created_at,
    counts: countsById.get(r.id) ?? { identified: 0, screened: 0, included: 0 },
  }))
}

export interface CreateProjectInput {
  name: string
  description?: string
  prosperoId?: string
  reviewersRequiredPerRecord: number
  stagesEnabled: ScreeningStage[]
}

export async function createProject(input: CreateProjectInput): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('create_project', {
    p_name: input.name,
    p_description: input.description ?? '',
    p_prospero_id: input.prosperoId ?? null,
    p_reviewers_required_per_record: input.reviewersRequiredPerRecord,
    p_stages_enabled: input.stagesEnabled,
  })
  if (error) throw error
  return { id: data.id }
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, prospero_id, owner_id, settings, created_at, archived_at')
    .eq('id', projectId)
    .single()
  if (error) throw error
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    prosperoId: data.prospero_id,
    ownerId: data.owner_id,
    settings: data.settings,
    createdAt: data.created_at,
    archivedAt: data.archived_at,
  }
}

export async function updateProjectSettings(
  projectId: string,
  patch: { name?: string; description?: string; prosperoId?: string | null; settings?: ProjectSettings },
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.prosperoId !== undefined ? { prospero_id: patch.prosperoId } : {}),
      ...(patch.settings !== undefined ? { settings: patch.settings } : {}),
    })
    .eq('id', projectId)
  if (error) throw error
}

export async function archiveProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', projectId)
  if (error) throw error
}

export async function unarchiveProject(projectId: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ archived_at: null }).eq('id', projectId)
  if (error) throw error
}

/** Storage objects (imports/fulltext PDFs) aren't covered by the `on delete
 * cascade` on the DB tables that reference them — they live in Supabase
 * Storage, not a table row — so they need to be listed and removed
 * explicitly before the project row itself is deleted. `list()` only
 * descends one folder level at a time, hence the recursion. */
async function listStorageObjectPaths(bucket: string, prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) throw error
  const paths: string[] = []
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`
    if (entry.id === null) {
      paths.push(...(await listStorageObjectPaths(bucket, path)))
    } else {
      paths.push(path)
    }
  }
  return paths
}

async function deleteProjectStorageObjects(projectId: string): Promise<void> {
  for (const bucket of ['imports', 'fulltext'] as const) {
    const paths = await listStorageObjectPaths(bucket, projectId)
    if (paths.length > 0) {
      const { error } = await supabase.storage.from(bucket).remove(paths)
      if (error) throw error
    }
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteProjectStorageObjects(projectId)
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) throw error
}
