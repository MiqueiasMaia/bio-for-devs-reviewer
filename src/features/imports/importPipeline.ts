import { parseCsvRecords } from '@/domain/import/csv'
import { parseNbib } from '@/domain/import/nbib'
import { parseRis } from '@/domain/import/ris'
import type { ParsedRecord } from '@/domain/import/types'
import { computeDedupGroups } from '@/domain/dedup/dedup'
import type { ImportFormat } from '@/types/domain'
import type { ProjectDedupSettings } from '@/types/domain'
import * as api from './api'

export function detectFormat(filename: string): ImportFormat | null {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'ris') return 'ris'
  if (ext === 'nbib' || ext === 'txt') return 'nbib'
  if (ext === 'csv') return 'csv'
  return null
}

export function parseByFormat(format: ImportFormat, text: string): ParsedRecord[] {
  if (format === 'ris') return parseRis(text)
  if (format === 'nbib') return parseNbib(text)
  return parseCsvRecords(text)
}

export interface RunImportInput {
  projectId: string
  sourceName: string
  file: File
  format: ImportFormat
  records: ParsedRecord[]
  importedBy: string
  dedupSettings: ProjectDedupSettings
}

export interface RunImportResult {
  importId: string
  recordCount: number
  dedupGroupCount: number
}

/**
 * The full import pipeline: upload the original file, create the import
 * batch, bulk-insert records (and any embedded AI decisions), then re-run
 * deduplication across every non-duplicate record in the project (not just
 * the newly imported batch — a record can duplicate one from an earlier
 * import) and persist the resulting clusters.
 */
export async function runImportPipeline(input: RunImportInput): Promise<RunImportResult> {
  const { storagePath } = await api.uploadImportOriginal(input.projectId, input.file)

  const { id: importId } = await api.createImportBatch(input.projectId, {
    sourceName: input.sourceName,
    filename: input.file.name,
    format: input.format,
    rawStoragePath: storagePath,
    importedBy: input.importedBy,
  })

  const inserted = await api.bulkInsertRecords(input.projectId, importId, input.records)
  await api.updateImportRecordCount(importId, inserted.length)

  const aiPairs = input.records
    .map((r, i) => ({ recordId: inserted[i]?.id, decision: r.aiDecision }))
    .filter((p): p is { recordId: string; decision: NonNullable<typeof p.decision> } =>
      Boolean(p.recordId && p.decision),
    )
  await api.bulkInsertAiScreenings(aiPairs)

  const allNonDuplicates = await api.listNonDuplicateRecords(input.projectId)
  const dedupGroupIdByRecordId = new Map(allNonDuplicates.map((r) => [r.id, r.dedupGroupId]))
  const groups = computeDedupGroups(
    allNonDuplicates.map((r) => ({ id: r.id, doi: r.doi, title: r.title, year: r.year, abstract: r.abstract })),
    {
      onDoi: input.dedupSettings.on_doi,
      onNormalizedTitle: input.dedupSettings.on_normalized_title,
      titleSimilarityThreshold: input.dedupSettings.title_similarity_threshold,
    },
  )
  for (const group of groups) {
    // Reuse the chosen primary's existing dedup_group_id when it already
    // has one (e.g. it was the lone survivor of a group from an earlier
    // import), so re-running dedup after a second import doesn't orphan
    // duplicates that were already reviewed and linked to it.
    const groupId = dedupGroupIdByRecordId.get(group.primaryId) ?? crypto.randomUUID()
    await api.applyDedupGroup(groupId, group.recordIds, group.primaryId)
  }

  return { importId, recordCount: inserted.length, dedupGroupCount: groups.length }
}
