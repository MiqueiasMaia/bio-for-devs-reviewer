import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import type { ProjectOutletContext } from '@/features/projects/ProjectLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ErrorState'
import type { Decision, ScreeningStage } from '@/types/domain'
import { decisionLabelKey } from '@/lib/decisionLabel'
import { useConflicts, useResolveConflict } from './hooks'
import type { ConflictSummary } from './api'

const DECISION_COLOR: Record<Decision, string> = {
  INCLUDE: 'text-include border-include',
  UNCERTAIN: 'text-uncertain border-uncertain',
  EXCLUDE: 'text-exclude border-exclude',
}

function ConflictCard({ conflict, stage, projectId }: { conflict: ConflictSummary; stage: ScreeningStage; projectId: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const resolve = useResolveConflict(projectId, stage)
  const [rationale, setRationale] = useState('')

  function handleResolve(decision: Decision) {
    resolve.mutate({
      recordId: conflict.recordId,
      stage,
      resolvedDecision: decision,
      resolvedBy: user!.id,
      rationale,
    })
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <p className="text-xs text-mut">{conflict.humanRef} · {conflict.year ?? '—'}</p>
        <p className="font-semibold text-fg">{conflict.title}</p>
        <p className="text-xs italic text-mut">{conflict.authors}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {conflict.reviewerDecisions.map((rd) => (
          <div key={rd.reviewerId} className={clsx('rounded-md border-2 p-3 text-sm', DECISION_COLOR[rd.decision])}>
            <p className="font-semibold">{rd.reviewerName} — {t(decisionLabelKey(rd.decision))}</p>
            {rd.reasons.length > 0 && (
              <p className="mt-1 text-xs text-fg">
                {t('conflicts.reasons')}: {rd.reasons.join(', ')}
              </p>
            )}
            {rd.notes && <p className="mt-1 text-xs text-fg">{t('conflicts.notes')}: {rd.notes}</p>}
          </div>
        ))}
      </div>

      {conflict.aiScreening && (
        <div className="rounded-md border border-uncertain bg-[#fbefdc] p-3 text-sm">
          <p className="font-semibold text-uncertain">
            {t('conflicts.aiDecision')} ({conflict.aiScreening.modelName}):{' '}
            {t(decisionLabelKey(conflict.aiScreening.decision))}
          </p>
          {conflict.aiScreening.rationale && <p className="mt-1 text-xs text-fg">{conflict.aiScreening.rationale}</p>}
        </div>
      )}

      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder={t('conflicts.rationalePlaceholder')}
        className="min-h-10 rounded-md border border-line px-3 py-2 text-sm"
      />

      <div className="flex items-center gap-2">
        <span className="text-xs text-mut">{t('conflicts.resolveAs')}:</span>
        {(['INCLUDE', 'UNCERTAIN', 'EXCLUDE'] as Decision[]).map((d) => (
          <Button key={d} variant="secondary" disabled={resolve.isPending} onClick={() => handleResolve(d)}>
            {t(decisionLabelKey(d))}
          </Button>
        ))}
      </div>
    </Card>
  )
}

export function ConflictsPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const [stage, setStage] = useState<ScreeningStage>(project.settings.stages_enabled[0] ?? 'title_abstract')
  const { data: conflicts, isLoading, isError, refetch } = useConflicts(project.id, stage)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('conflicts.title')}</h2>
        <p className="text-sm text-mut">{t('conflicts.subtitle')}</p>
      </div>

      {project.settings.stages_enabled.length > 1 && (
        <div className="flex gap-1">
          {project.settings.stages_enabled.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                stage === s ? 'bg-fg text-white' : 'text-mut hover:bg-bg',
              )}
            >
              {s === 'title_abstract' ? t('screening.stageTitleAbstract') : t('screening.stageFullText')}
            </button>
          ))}
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <p className="text-sm text-mut">{t('common.loading')}</p>}
      {!isLoading && !isError && conflicts?.length === 0 && (
        <Card className="py-10 text-center text-sm text-mut">{t('conflicts.empty')}</Card>
      )}

      {conflicts?.map((c) => (
        <ConflictCard key={c.recordId} conflict={c} stage={stage} projectId={project.id} />
      ))}
    </div>
  )
}
