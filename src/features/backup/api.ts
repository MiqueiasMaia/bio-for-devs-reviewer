import { supabase } from '@/lib/supabase'
import { BACKUP_SCHEMA_VERSION, type ProjectBackup } from './schema'

export async function exportProjectBackup(projectId: string): Promise<ProjectBackup> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('name, description, prospero_id, settings')
    .eq('id', projectId)
    .single()
  if (projectError) throw projectError

  const { data: criteria, error: criteriaError } = await supabase
    .from('criteria')
    .select('kind, text, order_index, picots_dimension')
    .eq('project_id', projectId)
  if (criteriaError) throw criteriaError

  const { data: highlightTerms, error: htError } = await supabase
    .from('highlight_terms')
    .select('category, terms, color, order_index')
    .eq('project_id', projectId)
  if (htError) throw htError

  const { data: exclusionReasons, error: erError } = await supabase
    .from('exclusion_reasons')
    .select('code, label, order_index')
    .eq('project_id', projectId)
  if (erError) throw erError

  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select(
      'id, human_ref, doi, pmid, scopus_eid, title, authors, abstract, year, journal, source_db, dedup_group_id, is_duplicate, dedup_primary, raw',
    )
    .eq('project_id', projectId)
  if (recordsError) throw recordsError
  const recordIds = records.map((r) => r.id)

  const { data: screenings, error: screeningsError } =
    recordIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('screenings')
          .select('record_id, reviewer_id, stage, decision, reasons, notes, decided_at')
          .in('record_id', recordIds)
  if (screeningsError) throw screeningsError

  const { data: resolutions, error: resolutionsError } =
    recordIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('resolutions')
          .select('record_id, stage, resolved_decision, resolved_by, rationale, resolved_at')
          .in('record_id', recordIds)
  if (resolutionsError) throw resolutionsError

  const { data: aiScreenings, error: aiError } =
    recordIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('ai_screenings')
          .select('record_id, model_name, decision, rationale, confidence, stage')
          .in('record_id', recordIds)
  if (aiError) throw aiError

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name,
      description: project.description,
      prosperoId: project.prospero_id,
      settings: project.settings,
    },
    criteria: criteria.map((c) => ({
      kind: c.kind,
      text: c.text,
      orderIndex: c.order_index,
      picotsDimension: c.picots_dimension,
    })),
    highlightTerms: highlightTerms.map((h) => ({
      category: h.category,
      terms: h.terms,
      color: h.color,
      orderIndex: h.order_index,
    })),
    exclusionReasons: exclusionReasons.map((r) => ({
      code: r.code,
      label: r.label,
      orderIndex: r.order_index,
    })),
    records: records.map((r) => ({
      id: r.id,
      humanRef: r.human_ref,
      doi: r.doi,
      pmid: r.pmid,
      scopusEid: r.scopus_eid,
      title: r.title,
      authors: r.authors,
      abstract: r.abstract,
      year: r.year,
      journal: r.journal,
      sourceDb: r.source_db,
      dedupGroupId: r.dedup_group_id,
      isDuplicate: r.is_duplicate,
      dedupPrimary: r.dedup_primary,
      raw: r.raw,
    })),
    screenings: screenings.map((s) => ({
      recordId: s.record_id,
      reviewerId: s.reviewer_id,
      stage: s.stage,
      decision: s.decision,
      reasons: s.reasons,
      notes: s.notes,
      decidedAt: s.decided_at,
    })),
    resolutions: resolutions.map((r) => ({
      recordId: r.record_id,
      stage: r.stage,
      resolvedDecision: r.resolved_decision,
      resolvedBy: r.resolved_by,
      rationale: r.rationale,
      resolvedAt: r.resolved_at,
    })),
    aiScreenings: aiScreenings.map((a) => ({
      recordId: a.record_id,
      modelName: a.model_name,
      decision: a.decision,
      rationale: a.rationale,
      confidence: a.confidence,
      stage: a.stage,
    })),
  }
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportBackupResult {
  projectId: string
  recordCount: number
  screeningCount: number
  skippedScreenings: number
}

/**
 * Restores a backup into a brand new project owned by the current user.
 * Record ids are preserved (so screenings/resolutions/ai_screenings link up
 * without remapping); reviewer/resolver ids are preserved too, which only
 * resolves to a real name if those users exist in this Supabase project —
 * rows referencing an unknown user are skipped and counted, not silently
 * dropped without a trace.
 */
export async function importProjectBackup(
  backup: ProjectBackup,
  ownerId: string,
): Promise<ImportBackupResult> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: `${backup.project.name} (importado)`,
      description: backup.project.description,
      prospero_id: backup.project.prosperoId,
      owner_id: ownerId,
      created_by: ownerId,
      settings: backup.project.settings,
    })
    .select('id')
    .single()
  if (projectError) throw projectError
  const projectId = project.id

  const { error: memberError } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: ownerId, role: 'owner' })
  if (memberError) throw memberError

  if (backup.criteria.length > 0) {
    const { error } = await supabase.from('criteria').insert(
      backup.criteria.map((c) => ({
        project_id: projectId,
        kind: c.kind,
        text: c.text,
        order_index: c.orderIndex,
        picots_dimension: c.picotsDimension,
      })),
    )
    if (error) throw error
  }

  if (backup.highlightTerms.length > 0) {
    const { error } = await supabase.from('highlight_terms').insert(
      backup.highlightTerms.map((h) => ({
        project_id: projectId,
        category: h.category,
        terms: h.terms,
        color: h.color,
        order_index: h.orderIndex,
      })),
    )
    if (error) throw error
  }

  if (backup.exclusionReasons.length > 0) {
    const { error } = await supabase.from('exclusion_reasons').insert(
      backup.exclusionReasons.map((r) => ({
        project_id: projectId,
        code: r.code,
        label: r.label,
        order_index: r.orderIndex,
      })),
    )
    if (error) throw error
  }

  if (backup.records.length > 0) {
    const { error } = await supabase.from('records').insert(
      backup.records.map((r) => ({
        id: r.id,
        project_id: projectId,
        human_ref: r.humanRef,
        doi: r.doi,
        pmid: r.pmid,
        scopus_eid: r.scopusEid,
        title: r.title,
        authors: r.authors,
        abstract: r.abstract,
        year: r.year,
        journal: r.journal,
        source_db: r.sourceDb,
        dedup_group_id: r.dedupGroupId,
        is_duplicate: r.isDuplicate,
        dedup_primary: r.dedupPrimary,
        raw: r.raw,
      })),
    )
    if (error) throw error
  }

  // Records keep their original human_ref (REC0007, ...), so the new
  // project's counter must be primed past the highest imported number —
  // otherwise a later import/screening-import into this project would
  // eventually generate a human_ref that collides with one just restored.
  const highestSeq = backup.records.reduce((max, r) => {
    const match = r.humanRef.match(/^REC(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  if (highestSeq > 0) {
    const { error } = await supabase
      .from('record_counters')
      .upsert({ project_id: projectId, next_seq: highestSeq + 1 })
    if (error) throw error
  }

  const knownReviewerIds = new Set<string>()
  const reviewerIds = [
    ...new Set([
      ...backup.screenings.map((s) => s.reviewerId),
      ...backup.resolutions.map((r) => r.resolvedBy),
    ]),
  ]
  if (reviewerIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id').in('id', reviewerIds)
    for (const p of profiles ?? []) knownReviewerIds.add(p.id)
  }

  const importableScreenings = backup.screenings.filter((s) => knownReviewerIds.has(s.reviewerId))
  if (importableScreenings.length > 0) {
    const { error } = await supabase.from('screenings').insert(
      importableScreenings.map((s) => ({
        record_id: s.recordId,
        reviewer_id: s.reviewerId,
        stage: s.stage,
        decision: s.decision,
        reasons: s.reasons,
        notes: s.notes,
        decided_at: s.decidedAt,
      })),
    )
    if (error) throw error
  }

  const importableResolutions = backup.resolutions.filter((r) => knownReviewerIds.has(r.resolvedBy))
  if (importableResolutions.length > 0) {
    const { error } = await supabase.from('resolutions').insert(
      importableResolutions.map((r) => ({
        record_id: r.recordId,
        stage: r.stage,
        resolved_decision: r.resolvedDecision,
        resolved_by: r.resolvedBy,
        rationale: r.rationale,
        resolved_at: r.resolvedAt,
      })),
    )
    if (error) throw error
  }

  if (backup.aiScreenings.length > 0) {
    const { error } = await supabase.from('ai_screenings').insert(
      backup.aiScreenings.map((a) => ({
        record_id: a.recordId,
        model_name: a.modelName,
        decision: a.decision,
        rationale: a.rationale,
        confidence: a.confidence,
        stage: a.stage,
      })),
    )
    if (error) throw error
  }

  return {
    projectId,
    recordCount: backup.records.length,
    screeningCount: importableScreenings.length,
    skippedScreenings: backup.screenings.length - importableScreenings.length,
  }
}
