import { supabase } from '@/lib/supabase'

export interface ExtractionEligibleRecord {
  id: string
  humanRef: string
  title: string
  authors: string
  year: number | null
  doi: string | null
}

/** Same "included" set as Risk of Bias (src/features/riskOfBias/api.ts):
 * INCLUDE at title/abstract (counts directly) union INCLUDE at full-text
 * (the outcome for records that were UNCERTAIN at title/abstract). */
export async function listExtractionEligibleRecords(projectId: string): Promise<ExtractionEligibleRecord[]> {
  const { data: finals, error: finalsError } = await supabase
    .from('v_record_final_decision')
    .select('record_id, stage')
    .eq('project_id', projectId)
    .eq('final_decision', 'INCLUDE')
    .in('stage', ['title_abstract', 'full_text'])
  if (finalsError) throw finalsError
  const recordIds = [...new Set(finals.map((f) => f.record_id))]
  if (recordIds.length === 0) return []

  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('id, human_ref, title, authors, year, doi')
    .in('id', recordIds)
    .order('human_ref', { ascending: true })
  if (recordsError) throw recordsError
  return records.map((r) => ({
    id: r.id,
    humanRef: r.human_ref,
    title: r.title,
    authors: r.authors,
    year: r.year,
    doi: r.doi,
  }))
}

export interface ExtractionData {
  answers: Record<string, string | string[]>
  notes: string
}

export async function getExtraction(recordId: string, extractorId: string): Promise<ExtractionData | null> {
  const { data, error } = await supabase
    .from('data_extractions')
    .select('answers, notes')
    .eq('record_id', recordId)
    .eq('extractor_id', extractorId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { answers: data.answers, notes: data.notes }
}

export async function saveExtraction(input: {
  recordId: string
  extractorId: string
  answers: Record<string, string | string[]>
  notes: string
}): Promise<void> {
  const { error } = await supabase.from('data_extractions').upsert(
    {
      record_id: input.recordId,
      extractor_id: input.extractorId,
      answers: input.answers,
      notes: input.notes,
    },
    { onConflict: 'record_id,extractor_id' },
  )
  if (error) throw error
}

/** Per-record "has this extractor finished this record" map, for the
 * done/pending badge in the record list — mirrors listRobOverallStatus. */
export async function listExtractionStatus(
  projectId: string,
  extractorId: string,
): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from('data_extractions')
    .select('record_id, records!inner(project_id)')
    .eq('extractor_id', extractorId)
    .eq('records.project_id', projectId)
    .returns<{ record_id: string }[]>()
  if (error) throw error
  return new Map(data.map((r) => [r.record_id, true]))
}

export interface ExtractionFieldStatus {
  recordId: string
  fieldKey: string
  extractorsCount: number
  distinctValueCount: number
  isConflict: boolean
  finalValue: string | string[] | null
}

export async function listFieldStatus(projectId: string): Promise<ExtractionFieldStatus[]> {
  const { data, error } = await supabase
    .from('v_extraction_field_status')
    .select('record_id, field_key, extractors_count, distinct_value_count, is_conflict, final_value')
    .eq('project_id', projectId)
  if (error) throw error
  return data.map((r) => ({
    recordId: r.record_id,
    fieldKey: r.field_key,
    extractorsCount: r.extractors_count,
    distinctValueCount: r.distinct_value_count,
    isConflict: r.is_conflict,
    finalValue: r.final_value,
  }))
}

export interface ExtractionConflictDetail {
  recordId: string
  humanRef: string
  title: string
  fieldKey: string
  fieldLabel: string
  values: { extractorId: string; extractorName: string; value: string | string[] }[]
}

export async function listExtractionConflicts(projectId: string): Promise<ExtractionConflictDetail[]> {
  const statuses = await listFieldStatus(projectId)
  const conflicts = statuses.filter((s) => s.isConflict)
  if (conflicts.length === 0) return []

  const recordIds = [...new Set(conflicts.map((c) => c.recordId))]
  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('id, human_ref, title')
    .in('id', recordIds)
  if (recordsError) throw recordsError
  const recordById = new Map(records.map((r) => [r.id, r]))

  const { data: fields, error: fieldsError } = await supabase
    .from('extraction_fields')
    .select('key, label')
    .eq('project_id', projectId)
  if (fieldsError) throw fieldsError
  const labelByKey = new Map(fields.map((f) => [f.key, f.label]))

  const { data: extractions, error: extractionsError } = await supabase
    .from('data_extractions')
    .select('record_id, extractor_id, answers')
    .in('record_id', recordIds)
  if (extractionsError) throw extractionsError

  const extractorIds = [...new Set(extractions.map((e) => e.extractor_id))]
  const { data: profiles, error: profilesError } =
    extractorIds.length === 0
      ? { data: [], error: null }
      : await supabase.from('profiles').select('id, display_name').in('id', extractorIds)
  if (profilesError) throw profilesError
  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]))

  const extractionsByRecord = new Map<string, { extractor_id: string; answers: Record<string, string | string[]> }[]>()
  for (const e of extractions) {
    const list = extractionsByRecord.get(e.record_id) ?? []
    list.push(e)
    extractionsByRecord.set(e.record_id, list)
  }

  return conflicts
    .map((c) => {
      const record = recordById.get(c.recordId)
      if (!record) return null
      const values = (extractionsByRecord.get(c.recordId) ?? [])
        .filter((e) => c.fieldKey in e.answers)
        .map((e) => ({
          extractorId: e.extractor_id,
          extractorName: nameById.get(e.extractor_id) ?? '—',
          value: e.answers[c.fieldKey],
        }))
      return {
        recordId: c.recordId,
        humanRef: record.human_ref,
        title: record.title,
        fieldKey: c.fieldKey,
        fieldLabel: labelByKey.get(c.fieldKey) ?? c.fieldKey,
        values,
      }
    })
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
}

export async function resolveExtractionField(input: {
  recordId: string
  fieldKey: string
  resolvedValue: string | string[]
  resolvedBy: string
  rationale: string
}): Promise<void> {
  const { error } = await supabase.from('extraction_resolutions').upsert(
    {
      record_id: input.recordId,
      field_key: input.fieldKey,
      resolved_value: input.resolvedValue,
      resolved_by: input.resolvedBy,
      rationale: input.rationale,
    },
    { onConflict: 'record_id,field_key' },
  )
  if (error) throw error
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/**
 * One row per included study, one column per extraction field, using each
 * field's final_value (unanimous agreement or an explicit resolution) —
 * blank when a field hasn't been extracted, or is still in conflict, yet.
 * Same CSV conventions (BOM + CRLF + quoted cells) as
 * screening/csvRoundTrip.ts's exportDecisionsCsv, so it opens cleanly in
 * Excel either way.
 */
export async function exportExtractionCsv(
  projectId: string,
  fields: { key: string; label: string }[],
): Promise<string> {
  const [records, statuses] = await Promise.all([
    listExtractionEligibleRecords(projectId),
    listFieldStatus(projectId),
  ])
  const valueByRecordAndField = new Map<string, string | string[] | null>()
  for (const s of statuses) valueByRecordAndField.set(`${s.recordId}:${s.fieldKey}`, s.finalValue)

  const headers = ['human_ref', 'title', 'authors', 'year', 'doi', ...fields.map((f) => f.label)]
  const rows = records.map((r) => [
    r.humanRef,
    r.title,
    r.authors,
    r.year,
    r.doi,
    ...fields.map((f) => {
      const value = valueByRecordAndField.get(`${r.id}:${f.key}`)
      return Array.isArray(value) ? value.join('; ') : (value ?? '')
    }),
  ])

  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','))
  return '﻿' + lines.join('\r\n')
}
