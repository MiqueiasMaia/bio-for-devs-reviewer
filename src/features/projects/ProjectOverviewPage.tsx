import { useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { DecisionDonut } from '@/components/ui/DecisionDonut'
import { Avatar } from '@/components/ui/Avatar'
import { CheckCircleIcon, PlusIcon, SplitIcon, TrashIcon } from '@/components/ui/icons'
import type { ProjectOutletContext } from './ProjectLayout'
import { usePrismaCounts } from '@/features/prisma/hooks'
import { useOpenConflictCount, useReviewerProgress } from '@/features/dashboard/hooks'
import { useDedupSummary } from '@/features/imports/hooks'
import { DedupResolutionWizard } from '@/features/imports/DedupResolutionWizard'
import { AgreementCard } from '@/features/agreement/AgreementCard'
import { useAgreement } from '@/features/agreement/hooks'
import { useQueueSummary } from '@/features/screening/hooks'
import { useAuth } from '@/features/auth/useAuth'
import { AiScreeningCard } from '@/features/aiScreening/AiScreeningCard'
import { SnowballingCard } from '@/features/snowballing/SnowballingCard'
import { GetStartedWidget } from './GetStartedWidget'
import type { ScreeningStage } from '@/types/domain'

export function ProjectOverviewPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stage, setStage] = useState<ScreeningStage>(project.settings.stages_enabled[0] ?? 'title_abstract')
  const [dedupModalOpen, setDedupModalOpen] = useState(false)

  const { data: counts } = usePrismaCounts(project.id)
  const { data: reviewerProgress } = useReviewerProgress(project.id, stage)
  const { data: conflictCount } = useOpenConflictCount(project.id, stage)
  const { data: dedupSummary } = useDedupSummary(project.id)
  const { data: myProgress } = useQueueSummary(project.id, stage, user!.id)
  const { data: agreement } = useAgreement(project.id, stage, false)

  const stageTotal = stage === 'title_abstract' ? counts?.recordsScreenedTa : counts?.fulltextSought
  const alignedPct =
    agreement && agreement.method !== 'insufficient_data' && !Number.isNaN(agreement.percentAgreement)
      ? Math.round(agreement.percentAgreement * 100)
      : null

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
      <div className="flex flex-col gap-3">
        <h3 className="border-b border-line pb-2 text-sm font-semibold text-fg">{t('dataSummary.title')}</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="flex flex-col items-center gap-2 text-center">
            <p className="text-xs text-mut">{t('dataSummary.imported')}</p>
            <p className="font-mono text-2xl font-bold text-fg">{counts?.recordsIdentified ?? '—'}</p>
            <IconButton icon={<PlusIcon />} label={t('dashboard.addReferences')} onClick={() => navigate('import')} />
          </Card>
          <Card className="flex flex-col items-center gap-2 text-center">
            <p className="text-xs text-mut">{t('dataSummary.totalDuplicates')}</p>
            <p className="font-mono text-2xl font-bold text-fg">{counts?.duplicatesRemoved ?? '—'}</p>
            <IconButton
              icon={<SplitIcon />}
              label={t('dashboard.reviewDuplicates')}
              onClick={() => setDedupModalOpen(true)}
              disabled={!dedupSummary || dedupSummary.unresolved === 0}
            />
          </Card>
          <Card className="flex flex-col items-center gap-2 text-center">
            <p className="text-xs text-mut">{t('dataSummary.unresolved')}</p>
            <p className="font-mono text-2xl font-bold text-fg">{dedupSummary?.unresolved ?? '—'}</p>
            <Button
              variant="secondary"
              onClick={() => setDedupModalOpen(true)}
              disabled={!dedupSummary || dedupSummary.unresolved === 0}
            >
              {t('dataSummary.continueResolving')}
            </Button>
          </Card>
          <Card className="flex flex-col justify-center gap-2.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-mut">
                <CheckCircleIcon className="h-4 w-4 shrink-0" />
                {t('dataSummary.resolved')}
              </span>
              <span className="font-mono font-semibold text-fg">{dedupSummary?.resolved ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-mut">
                <SplitIcon className="h-4 w-4 shrink-0" />
                {t('dataSummary.notDuplicate')}
              </span>
              <span className="font-mono font-semibold text-fg">{dedupSummary?.notDuplicateCount ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-mut">
                <TrashIcon className="h-4 w-4 shrink-0" />
                {t('dataSummary.deleted')}
              </span>
              <span className="font-mono font-semibold text-fg">{dedupSummary?.deletedRecords ?? '—'}</span>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={dedupModalOpen} onClose={() => setDedupModalOpen(false)} title={t('duplicates.title')} size="wide">
        <DedupResolutionWizard projectId={project.id} />
      </Modal>

      {/* Unified screening + team progress, Rayyan-style ------------------ */}
      <div className="border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="text-sm font-semibold text-fg">
            {t('progress.title')}{' '}
            <span className="font-normal text-mut">
              ({project.settings.blind_screening ? t('progress.blindOn') : t('progress.blindOff')})
            </span>
          </h3>
          <Link to="settings/criteria">
            <Button variant="secondary">{t('progress.screeningCriteria')}</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          {/* Your Progress */}
          <div className="flex flex-col items-center gap-4 border-b border-line pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
            <h4 className="self-start text-xs font-semibold uppercase tracking-wide text-mut">
              {t('progress.yourProgress')}
            </h4>
            {myProgress && (
              <DecisionDonut
                include={myProgress.include}
                uncertain={myProgress.uncertain}
                exclude={myProgress.exclude}
                undecided={myProgress.undecided}
                total={myProgress.total}
              />
            )}
            <p className="text-sm text-fg">
              {myProgress?.undecided === 0
                ? t('progress.allScreened')
                : t('progress.articlesLeft', { count: myProgress?.undecided ?? 0 })}
            </p>
            <Link to={stage === 'title_abstract' ? 'screening/title-abstract' : 'screening/full-text'}>
              <Button>{t('progress.goToScreening')}</Button>
            </Link>
          </div>

          {/* Screening Summary + Team Progress */}
          <div className="flex flex-col gap-5">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mut">
                {t('screeningSummary.title')}
              </h4>
              <div className="mb-2 flex items-center justify-between text-sm">
                <Link to="conflicts" className="font-medium text-fg hover:text-include">
                  {t('screeningSummary.conflictsCount', { count: conflictCount ?? 0 })}
                </Link>
                <span className="text-mut">
                  {alignedPct !== null ? t('screeningSummary.alignedPct', { pct: alignedPct }) : '—'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-exclude">
                <div className="h-full bg-include" style={{ width: `${alignedPct ?? 0}%` }} />
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mut">
                {t('teamProgress.title')}
              </h4>
              {reviewerProgress?.length === 0 && <p className="text-sm text-mut">—</p>}
              <ul className="flex flex-col gap-1">
                {reviewerProgress?.map((r) => {
                  const total = stageTotal ?? 0
                  const pending = Math.max(total - r.decisionsMade, 0)
                  const pct = total > 0 ? Math.round((100 * r.decisionsMade) / total) : 0
                  return (
                    <li
                      key={r.reviewerId}
                      className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-b-0"
                    >
                      <span className="flex items-center gap-2.5">
                        <Avatar seed={r.reviewerId} initials={r.reviewerInitials} />
                        <span className="text-fg">
                          {r.reviewerName} <span className="text-xs text-mut">({t(`projects.role_${r.role}`)})</span>
                        </span>
                      </span>
                      <span className="text-right text-xs text-mut">
                        <div>{t('teamProgress.pending', { count: pending })}</div>
                        <div className="font-semibold text-fg">{t('progress.pctDone', { pct })}</div>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <AgreementCard projectId={project.id} stage={stage} />

      {project.settings.ai_screening_enabled && <AiScreeningCard projectId={project.id} stage={stage} />}

      <SnowballingCard projectId={project.id} />

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
