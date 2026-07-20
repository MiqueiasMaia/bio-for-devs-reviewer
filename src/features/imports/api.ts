import { supabase } from '@/lib/supabase'
import type { ParsedRecord } from '@/domain/import/types'
import type { ImportFormat, Decision } from '@/types/domain'

export async function uploadImportOriginal(
  projectId: string,
  file: File,
): Promise<{ storagePath: string }> {
  const safeName = file.name.replace(/[^A-Za-z0-9_.-]+/g, '_')
  const storagePath = `${projectId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from('imports').upload(storagePath, file)
  if (error) throw error
  return { storagePath }
}

export async function createImportBatch(
  projectId: string,
  input: { sourceName: string; filename: string; format: ImportFormat; rawStoragePath: string; importedBy: string },
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('imports')
    .insert({
      project_id: projectId,
      source_name: input.sourceName,
      filename: input.filename,
      format: input.format,
      raw_storage_path: input.rawStoragePath,
      imported_by: input.importedBy,
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id }
}

export interface InsertedRecord {
  id: string
  doi: string | null
  title: string
  year: number | null
  abstract: string | null
}

const INSERT_BATCH_SIZE = 200

export async function bulkInsertRecords(
  projectId: string,
  importId: string,
  records: ParsedRecord[],
): Promise<InsertedRecord[]> {
  const inserted: InsertedRecord[] = []
  for (let i = 0; i < records.length; i += INSERT_BATCH_SIZE) {
    const batch = records.slice(i, i + INSERT_BATCH_SIZE)
    const { data, error } = await supabase
      .from('records')
      .insert(
        batch.map((r) => ({
          project_id: projectId,
          import_id: importId,
          doi: r.doi,
          pmid: r.pmid,
          title: r.title,
          authors: r.authors,
          abstract: r.abstract,
          year: r.year,
          journal: r.journal,
          source_db: r.sourceDb,
          raw: r.raw,
        })),
      )
      .select('id, doi, title, year, abstract')
    if (error) throw error
    inserted.push(...data)
  }
  return inserted
}

export async function updateImportRecordCount(importId: string, count: number): Promise<void> {
  const { error } = await supabase.from('imports').update({ record_count: count }).eq('id', importId)
  if (error) throw error
}

export async function bulkInsertAiScreenings(
  pairs: { recordId: string; decision: Decision }[],
): Promise<void> {
  if (pairs.length === 0) return
  for (let i = 0; i < pairs.length; i += INSERT_BATCH_SIZE) {
    const batch = pairs.slice(i, i + INSERT_BATCH_SIZE)
    const { error } = await supabase.from('ai_screenings').insert(
      batch.map((p) => ({
        record_id: p.recordId,
        model_name: 'imported',
        decision: p.decision,
        stage: 'title_abstract' as const,
      })),
    )
    if (error) throw error
  }
}

export interface DedupableRecord {
  id: string
  doi: string | null
  title: string
  year: number | null
  abstract: string | null
  dedupGroupId: string | null
}

export async function listNonDuplicateRecords(projectId: string): Promise<DedupableRecord[]> {
  const { data, error } = await supabase
    .from('records')
    .select('id, doi, title, year, abstract, dedup_group_id')
    .eq('project_id', projectId)
    .eq('is_duplicate', false)
  if (error) throw error
  return data.map((r) => ({
    id: r.id,
    doi: r.doi,
    title: r.title,
    year: r.year,
    abstract: r.abstract,
    dedupGroupId: r.dedup_group_id,
  }))
}

export async function applyDedupGroup(
  groupId: string,
  recordIds: string[],
  primaryId: string,
): Promise<void> {
  const duplicateIds = recordIds.filter((id) => id !== primaryId)
  const { error: primaryError } = await supabase
    .from('records')
    .update({ dedup_group_id: groupId, is_duplicate: false, dedup_primary: true })
    .eq('id', primaryId)
  if (primaryError) throw primaryError

  if (duplicateIds.length > 0) {
    const { error: dupError } = await supabase
      .from('records')
      .update({ dedup_group_id: groupId, is_duplicate: true, dedup_primary: false })
      .in('id', duplicateIds)
    if (dupError) throw dupError
  }
}

export interface DedupGroupSummary {
  dedupGroupId: string
  records: {
    id: string
    humanRef: string
    title: string
    authors: string
    year: number | null
    doi: string | null
    isDuplicate: boolean
    dedupPrimary: boolean
  }[]
}

export async function listDedupGroups(projectId: string): Promise<DedupGroupSummary[]> {
  const { data: groups, error: groupsError } = await supabase
    .from('v_dedup_groups')
    .select('dedup_group_id, record_ids')
    .eq('project_id', projectId)
  if (groupsError) throw groupsError
  if (groups.length === 0) return []

  const allIds = groups.flatMap((g) => g.record_ids)
  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('id, human_ref, title, authors, year, doi, is_duplicate, dedup_primary')
    .in('id', allIds)
  if (recordsError) throw recordsError

  const byId = new Map(records.map((r) => [r.id, r]))
  return groups.map((g) => ({
    dedupGroupId: g.dedup_group_id,
    records: g.record_ids
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({
        id: r.id,
        humanRef: r.human_ref,
        title: r.title,
        authors: r.authors,
        year: r.year,
        doi: r.doi,
        isDuplicate: r.is_duplicate,
        dedupPrimary: r.dedup_primary,
      })),
  }))
}

/** Removes a record from its duplicate cluster: it becomes its own, non-duplicate record. */
export async function splitRecordFromGroup(recordId: string): Promise<void> {
  const { error } = await supabase
    .from('records')
    .update({ dedup_group_id: null, is_duplicate: false, dedup_primary: false })
    .eq('id', recordId)
  if (error) throw error
}

/** Re-picks which record in a group is the non-duplicate "primary" survivor. */
export async function setDedupPrimary(groupId: string, recordIds: string[], primaryId: string): Promise<void> {
  await applyDedupGroup(groupId, recordIds, primaryId)
}
