import { supabase } from '@/lib/supabase'
import { parseCsvText } from '@/domain/import/csv'
import type { Decision, ScreeningStage } from '@/types/domain'

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function buildCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','))
  // UTF-8 BOM + CRLF line endings: matches the legacy screener's export
  // exactly so triagem_*.csv files stay Excel-friendly either way.
  return '﻿' + lines.join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Exports every decision recorded in the project — a superset of the
 * legacy screener's export columns (adds journal, source_db, stage,
 * resolved_decision on top of rec_id/reviewer/decision/reasons/notes).
 */
export async function exportDecisionsCsv(projectId: string): Promise<string> {
  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('id, human_ref, doi, title, year, journal, source_db')
    .eq('project_id', projectId)
  if (recordsError) throw recordsError

  // Filtered through the records embed (project_id) rather than a
  // `.in('record_id', ids)` list — with hundreds of records that list would
  // risk hitting URL-length limits. See the equivalent note in
  // features/screening/api.ts and features/projects/api.ts.
  const { data: screenings, error: screeningsError } = await supabase
    .from('screenings')
    .select('record_id, reviewer_id, stage, decision, reasons, notes, decided_at, records!inner(project_id)')
    .eq('records.project_id', projectId)
    .returns<
      {
        record_id: string
        reviewer_id: string
        stage: string
        decision: Decision
        reasons: string[]
        notes: string
        decided_at: string
      }[]
    >()
  if (screeningsError) throw screeningsError

  const { data: resolutions, error: resolutionsError } = await supabase
    .from('resolutions')
    .select('record_id, stage, resolved_decision, records!inner(project_id)')
    .eq('records.project_id', projectId)
    .returns<{ record_id: string; stage: string; resolved_decision: Decision }[]>()
  if (resolutionsError) throw resolutionsError

  const reviewerIds = [...new Set(screenings.map((s) => s.reviewer_id))]
  const { data: profiles, error: profilesError } =
    reviewerIds.length === 0
      ? { data: [], error: null }
      : await supabase.from('profiles').select('id, display_name').in('id', reviewerIds)
  if (profilesError) throw profilesError

  const recordById = new Map(records.map((r) => [r.id, r]))
  const reviewerNameById = new Map(profiles.map((p) => [p.id, p.display_name]))
  const resolutionByKey = new Map(resolutions.map((r) => [`${r.record_id}:${r.stage}`, r.resolved_decision]))

  const headers = [
    'human_ref',
    'doi',
    'title',
    'year',
    'journal',
    'source_db',
    'stage',
    'reviewer',
    'decision',
    'reasons',
    'notes',
    'decided_at',
    'resolved_decision',
  ]
  const rows = screenings.map((s) => {
    const record = recordById.get(s.record_id)
    return [
      record?.human_ref ?? '',
      record?.doi ?? '',
      record?.title ?? '',
      record?.year ?? '',
      record?.journal ?? '',
      record?.source_db ?? '',
      s.stage,
      reviewerNameById.get(s.reviewer_id) ?? '',
      s.decision,
      (s.reasons ?? []).join('; '),
      (s.notes ?? '').replace(/\r?\n/g, ' '),
      s.decided_at,
      resolutionByKey.get(`${s.record_id}:${s.stage}`) ?? '',
    ]
  })
  return buildCsv(headers, rows)
}

function normalizeDecision(value: string | undefined): Decision | null {
  const s = (value ?? '').trim().toUpperCase()
  return s === 'INCLUDE' || s === 'UNCERTAIN' || s === 'EXCLUDE' ? s : null
}

function normalizeLegacyReasons(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(/[;,]/)
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(Boolean)
}

export interface ImportDecisionsResult {
  imported: number
  skipped: number
}

/**
 * Imports a legacy triagem_*.csv (rec_id, reviewer, human_decision,
 * human_reasons, human_notes, year, title, doi, exported_on) as screenings
 * for the CURRENT logged-in reviewer — matching the old app's own "resume
 * where you left off" behavior, where the CSV's reviewer column was only
 * ever a free-text label, not an identity.
 */
export async function importLegacyDecisionsCsv(
  projectId: string,
  text: string,
  reviewerId: string,
  stage: ScreeningStage = 'title_abstract',
): Promise<ImportDecisionsResult> {
  const { headers, rows } = parseCsvText(text)
  const lower = headers.map((h) => h.toLowerCase())
  if (!lower.includes('rec_id') || !lower.includes('human_decision')) {
    throw new Error('CSV precisa das colunas rec_id e human_decision.')
  }

  const { data: records, error } = await supabase
    .from('records')
    .select('id, human_ref')
    .eq('project_id', projectId)
  if (error) throw error
  const idByHumanRef = new Map(records.map((r) => [r.human_ref, r.id]))

  let imported = 0
  let skipped = 0
  const upserts: {
    record_id: string
    reviewer_id: string
    stage: ScreeningStage
    decision: Decision
    reasons: string[]
    notes: string
  }[] = []

  for (const row of rows) {
    const recordId = idByHumanRef.get(row.rec_id?.trim())
    const decision = normalizeDecision(row.human_decision)
    if (!recordId || !decision) {
      skipped++
      continue
    }
    upserts.push({
      record_id: recordId,
      reviewer_id: reviewerId,
      stage,
      decision,
      reasons: normalizeLegacyReasons(row.human_reasons),
      notes: row.human_notes ?? '',
    })
    imported++
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase
      .from('screenings')
      .upsert(upserts, { onConflict: 'record_id,reviewer_id,stage' })
    if (upsertError) throw upsertError
  }

  return { imported, skipped }
}
