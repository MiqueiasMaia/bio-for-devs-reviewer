import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import type { ProjectOutletContext } from '@/features/projects/ProjectLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { StageGate } from '@/components/StageGate'
import { useExtractionConflicts, useResolveExtractionField } from './hooks'
import type { ExtractionConflictDetail } from './api'

function formatValue(value: string | string[]): string {
  return Array.isArray(value) ? value.join(', ') : value
}

function ExtractionConflictCard({ conflict, projectId }: { conflict: ExtractionConflictDetail; projectId: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const resolve = useResolveExtractionField(projectId)
  const [customValue, setCustomValue] = useState('')
  const [rationale, setRationale] = useState('')

  function handleResolve(value: string | string[]) {
    resolve.mutate({
      recordId: conflict.recordId,
      fieldKey: conflict.fieldKey,
      resolvedValue: value,
      resolvedBy: user!.id,
      rationale,
    })
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <p className="text-xs text-mut">
          {conflict.humanRef} · {t('dataExtraction.fieldLabel')}: {conflict.fieldLabel}
        </p>
        <p className="font-semibold text-fg">{conflict.title}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {conflict.values.map((v) => (
          <div key={v.extractorId} className="flex flex-col gap-2 border-2 border-line p-3 text-sm">
            <p className="font-semibold text-fg">{v.extractorName}</p>
            <p className="text-fg">{formatValue(v.value)}</p>
            <Button variant="secondary" disabled={resolve.isPending} onClick={() => handleResolve(v.value)}>
              {t('dataExtraction.useThisValue')}
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="text-xs text-mut">{t('dataExtraction.orCustomValue')}</p>
        <div className="flex items-end gap-2">
          <TextField label="" aria-label={t('dataExtraction.customValue')} value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
          <Button
            variant="secondary"
            disabled={resolve.isPending || !customValue.trim()}
            onClick={() => handleResolve(customValue.trim())}
          >
            {t('dataExtraction.useThisValue')}
          </Button>
        </div>
      </div>

      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder={t('conflicts.rationalePlaceholder')}
        className="min-h-10 border border-line px-3 py-2 text-sm"
      />
    </Card>
  )
}

export function ExtractionConflictsPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const { data: conflicts, isLoading } = useExtractionConflicts(project.id)

  return (
    <StageGate project={project} stage="data_extraction">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('dataExtraction.conflictsTitle')}</h2>
            <p className="text-sm text-mut">{t('dataExtraction.conflictsSubtitle')}</p>
          </div>
          <Link to=".." relative="path" className="text-sm text-include">
            ← {t('dataExtraction.backToExtraction')}
          </Link>
        </div>

        {isLoading && <p className="text-sm text-mut">{t('common.loading')}</p>}
        {!isLoading && conflicts?.length === 0 && (
          <Card className="py-10 text-center text-sm text-mut">{t('dataExtraction.noConflicts')}</Card>
        )}

        {conflicts?.map((c) => (
          <ExtractionConflictCard key={`${c.recordId}-${c.fieldKey}`} conflict={c} projectId={project.id} />
        ))}
      </div>
    </StageGate>
  )
}
