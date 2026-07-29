import { useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DecisionDonut } from '@/components/ui/DecisionDonut'
import type { ProjectOutletContext } from './ProjectLayout'
import { usePrismaCounts } from '@/features/prisma/hooks'
import { useOpenConflictCount, useReviewerProgress } from '@/features/dashboard/hooks'
import { useDedupGroups, useDedupSummary } from '@/features/imports/hooks'
import { DedupResolutionWizard } from '@/features/imports/DedupResolutionWizard'
import { AgreementCard } from '@/features/agreement/AgreementCard'
import { useQueueSummary, useProjectDecisionCounts } from '@/features/screening/hooks'
import { useAuth } from '@/features/auth/useAuth'
import { AiScreeningCard } from '@/features/aiScreening/AiScreeningCard'
import { GetStartedWidget } from './GetStartedWidget'
import type { ScreeningStage } from '@/types/domain'

export function ProjectOverviewPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stage, setStage] = useState<ScreeningStage>(project.settings.stages_enabled[0] ?? 'title_abstract')
  const [dedupModalOpen, setDedupModalOpen] = useState(false)
  const [progressView, setProgressView] = useState<'mine' | 'project'>('mine')

  const { data: counts } = usePrismaCounts(project.id)
  const { data: reviewerProgress } = useReviewerProgress(project.id, stage)
  const { data: conflictCount } = useOpenConflictCount(project.id, stage)
  const { data: dedupGroups } = useDedupGroups(project.id)
  const { data: dedupSummary } = useDedupSummary(project.id)
  const { data: myProgress } = useQueueSummary(project.id, stage, user!.id)
  const { data: projectProgress } = useProjectDecisionCounts(project.id, stage)

  const stageTotal = stage === 'title_abstract' ? counts?.recordsScreenedTa : counts?.fulltextSought
  const donutData = progressView === 'mine' ? myProgress : projectProgress

  return (
    <div className="flex flex-col gap-6">
      <GetStartedWidget project={project} onReviewDuplicates={() => setDedupModalOpen(true)} />

      <div>
        <h2 className="mb-1 text-lg font-semibold text-fg">{t('dashboard.title')}</h2>
        {project.description && <p className="text-sm text-mut">{project.description}</p>}
      </div>

      {project.settings.stages_enabled.length > 1 && (
        <div className="flex gap-1">
          {project.settings.stages_enabled.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium',
                stage === s ? 'bg-fg text-white' : 'text-mut hover:bg-bg',
              )}
            >
              {s === 'title_abstract' ? t('screening.stageTitleAbstract') : t('screening.stageFullText')}
            </button>
          ))}
        </div>
      )}

      {/* Data Summary --------------------------------------------------- */}
      <Card className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-fg">{t('dataSummary.title')}</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-mut">{t('dataSummary.imported')}</p>
            <p className="font-mono text-xl font-bold text-fg">{counts?.recordsIdentified ?? '—'}</p>
            <Button variant="secondary" className="self-start" onClick={() => navigate('import')}>
              {t('dashboard.addReferences')}
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-mut">{t('dataSummary.totalDuplicates')}</p>
            <p className="font-mono text-xl font-bold text-fg">{counts?.duplicatesRemoved ?? '—'}</p>
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => setDedupModalOpen(true)}
              disabled={!dedupGroups || dedupGroups.length === 0}
            >
              {t('dashboard.reviewDuplicates')}
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-mut">{t('dataSummary.unresolved')}</p>
            <p className="font-mono text-xl font-bold text-fg">{dedupSummary?.unresolved ?? '—'}</p>
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => setDedupModalOpen(true)}
              disabled={!dedupSummary || dedupSummary.unresolved === 0}
            >
              {t('dataSummary.continueResolving')}
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-mut">{t('dataSummary.resolved')}</p>
            <p className="font-mono text-xl font-bold text-fg">{dedupSummary?.resolved ?? '—'}</p>
          </div>
        </div>
      </Card>

      <Modal open={dedupModalOpen} onClose={() => setDedupModalOpen(false)} title={t('duplicates.title')} size="wide">
        <DedupResolutionWizard projectId={project.id} />
      </Modal>

      {/* Your progress / Project progress -------------------------------- */}
      <Card className="flex flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">{t('progress.title')}</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setProgressView('mine')}
              className={clsx(
                'px-3 py-1 text-xs font-medium',
                progressView === 'mine' ? 'bg-fg text-white' : 'text-mut hover:bg-bg',
              )}
            >
              {t('progress.yourView')}
            </button>
            <button
              onClick={() => setProgressView('project')}
              className={clsx(
                'px-3 py-1 text-xs font-medium',
                progressView === 'project' ? 'bg-fg text-white' : 'text-mut hover:bg-bg',
              )}
            >
              {t('progress.projectView')}
            </button>
          </div>
        </div>
        {donutData && (
          <DecisionDonut
            include={donutData.include}
            uncertain={donutData.uncertain}
            exclude={donutData.exclude}
            undecided={donutData.undecided}
            total={donutData.total}
          />
        )}
        <Link to={stage === 'title_abstract' ? 'screening/title-abstract' : 'screening/full-text'}>
          <Button>{t('progress.goToScreening')}</Button>
        </Link>
      </Card>

      {/* Screening summary ------------------------------------------------ */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">{t('screeningSummary.title')}</h3>
          <Link to="conflicts" className="text-sm text-include">
            {t('conflicts.title')} →
          </Link>
        </div>
        <div>
          <p className="text-xs text-mut">{t('screeningSummary.conflicts')}</p>
          <p className="font-mono text-2xl font-bold text-fg">{conflictCount ?? '—'}</p>
        </div>
      </Card>

      <AgreementCard projectId={project.id} stage={stage} />

      {project.settings.ai_screening_enabled && <AiScreeningCard projectId={project.id} stage={stage} />}

      {/* Team progress ------------------------------------------------ */}
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-fg">{t('teamProgress.title')}</h3>
        {reviewerProgress?.length === 0 && <p className="text-sm text-mut">—</p>}
        <ul className="flex flex-col gap-1.5 text-sm">
          {reviewerProgress?.map((r) => {
            const total = stageTotal ?? 0
            const pending = Math.max(total - r.decisionsMade, 0)
            const pct = total > 0 ? Math.round((100 * r.decisionsMade) / total) : 0
            return (
              <li
                key={r.reviewerId}
                className="flex items-center justify-between gap-2 border-b border-line py-1.5 last:border-b-0"
              >
                <span className="text-fg">{r.reviewerName}</span>
                <span className="font-mono text-xs text-mut">
                  {pct}% · {t('teamProgress.pending', { count: pending })}
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">{t('dashboard.prismaSnapshot')}</h3>
          <Link to="prisma" className="text-sm text-include">
            {t('dashboard.viewFull')} →
          </Link>
        </div>
        {counts && (
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-mut">{t('prisma.recordsIdentified')}</p>
              <p className="font-mono font-semibold text-fg">{counts.recordsIdentified}</p>
            </div>
            <div>
              <p className="text-xs text-mut">{t('prisma.recordsScreened')}</p>
              <p className="font-mono font-semibold text-fg">{counts.recordsScreenedTa}</p>
            </div>
            <div>
              <p className="text-xs text-mut">{t('prisma.fulltextAssessed')}</p>
              <p className="font-mono font-semibold text-fg">{counts.fulltextAssessed}</p>
            </div>
            <div>
              <p className="text-xs text-mut">{t('prisma.studiesIncluded')}</p>
              <p className="font-mono font-semibold text-fg">{counts.includedFinal}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
