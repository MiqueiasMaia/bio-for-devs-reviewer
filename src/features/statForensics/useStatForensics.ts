import { useMemo } from 'react'
import type { ExtractionFieldRow } from '@/features/projects/settings/api'
import type { ExtractionFieldStatus } from '@/features/dataExtraction/api'
import { runStatForensics, type StatForensicsResult } from '@/domain/statForensics/grimSprite'
import type { ExtractionStatRole } from '@/types/domain'

export interface StatForensicsView {
  result: StatForensicsResult
  values: Partial<Record<ExtractionStatRole, string>>
}

/** Combines a project's stat-role-tagged extraction fields (Configurações →
 * Campos de extração) with one record's reconciled field values — unanimous
 * agreement or an explicit resolution, same `final_value` the CSV export
 * and conflict screen use — and runs the GRIM/SPRITE check over whatever
 * roles are actually tagged and filled in. Null whenever there isn't
 * enough tagged/filled data to check anything, which is the common case
 * for projects that never tagged a stat role at all. */
export function useRecordStatForensics(
  recordId: string,
  fields: ExtractionFieldRow[] | undefined,
  fieldStatus: ExtractionFieldStatus[] | undefined,
): StatForensicsView | null {
  return useMemo(() => {
    if (!fields || !fieldStatus) return null

    const fieldKeyByRole = new Map<ExtractionStatRole, string>()
    for (const f of fields) {
      if (f.statRole) fieldKeyByRole.set(f.statRole, f.key)
    }
    if (fieldKeyByRole.size === 0) return null

    const statusByKey = new Map(
      fieldStatus.filter((s) => s.recordId === recordId).map((s) => [s.fieldKey, s.finalValue]),
    )

    const values: Partial<Record<ExtractionStatRole, string>> = {}
    for (const [role, key] of fieldKeyByRole) {
      const value = statusByKey.get(key)
      if (typeof value === 'string' && value.trim() !== '') values[role] = value
    }
    if (Object.keys(values).length === 0) return null

    return { result: runStatForensics(values), values }
  }, [recordId, fields, fieldStatus])
}
