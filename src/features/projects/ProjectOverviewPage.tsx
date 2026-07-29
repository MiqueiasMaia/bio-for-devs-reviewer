import { useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ProgressRing } from '@/components/ui/ProgressRing'
import type { ProjectOutletContext } from './ProjectLayout'
import { usePrismaCounts } from '@/features/prisma/hooks'
import { useOpenConflictCount, useReviewerProgress } from '@/features/dashboard/hooks'
import { useDedupGroups } from '@/features/imports/hooks'
import { DedupGroupList } from '@/features/imports/DedupGroupList'
import { AgreementCard } from '@/features/agreement/AgreementCard'
import { AiScreeningCard } from '@/features/aiScreening/AiScreeningCard'
import type { ScreeningStage } from '@/types/domain'

export function ProjectOverviewPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [stage, setStage] = useState<ScreeningStage>(project.settings.stages_enabled[0] ?? 'title_abstract')
  const [dedupModalOpen, setDedupModalOpen] = useState(false)

  const { data: counts } = usePrismaCounts(project.id)
  const { data: reviewerProgress } = useReviewerProgress(project.id, stage)
  const { data: conflictCount } = useOpenConflictCount(project.id, stage)
  const { data: dedupGroups } = useDedupGroups(project.id)

  const stageTotal = stage === 'title_abstract' ? counts?.recordsScreenedTa : counts?.fulltextSought

  return (
    <div className="flex flex-col gap-6">
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
                'rounded-md px-3 py-1.5 text-sm font-medium',
                stage === s ? 'bg-fg text-white' : 'text-mut hover:bg-bg',
              )}
            >
              {s === 'title_abstract' ? t('screening.stageTitleAbstract') : t('screening.stageFullText')}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-fg">{t('dashboard.importCard')}</h3>
          <p className="font-mono text-2xl font-bold text-fg">{counts?.recordsIdentified ?? '—'}</p>
          <p className="text-xs text-mut">{t('dashboard.importCardHint')}</p>
          <Button variant="secondary" className="mt-1 self-start" onClick={() => navigate('import')}>
            {t('dashboard.addReferences')}
          </Button>
        </Card>

        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-fg">{t('dashboard.duplicatesCard')}</h3>
          <p className="font-mono text-2xl font-bold text-fg">{dedupGroups?.length ?? '—'}</p>
          <p className="text-xs text-mut">{t('dashboard.duplicatesCardHint')}</p>
          <Button
            variant="secondary"
            className="mt-1 self-start"
            onClick={() => setDedupModalOpen(true)}
            disabled={!dedupGroups || dedupGroups.length === 0}
          >
            {t('dashboard.reviewDuplicates')}
          </Button>
        </Card>
      </div>

      <Modal open={dedupModalOpen} onClose={() => setDedupModalOpen(false)} title={t('duplicates.title')} size="wide">
        <DedupGroupList projectId={project.id} />
      </Modal>

      {counts && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-fg">{t('dashboard.stageProgress')}</h3>
          <div className="flex flex-wrap justify-around gap-4">
            <ProgressRing
              value={counts.recordsScreenedTa - counts.excludedTa - counts.fulltextSought}
              total={Math.max(counts.recordsScreenedTa, 1)}
              label={t('projects.identified')}
            />
            <ProgressRing
              value={counts.fulltextAssessed}
              total={Math.max(counts.fulltextSought, 1)}
              label={t('prisma.fulltextAssessed')}
            />
            <ProgressRing
              value={counts.includedFinal}
              total={Math.max(counts.recordsScreenedTa, 1)}
              label={t('projects.included')}
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-fg">{t('dashboard.throughput')}</h3>
          {reviewerProgress?.length === 0 && <p className="text-sm text-mut">—</p>}
          <ul className="flex flex-col gap-1.5 text-sm">
            {reviewerProgress?.map((r) => {
              const total = stageTotal ?? 0
              const pct = total > 0 ? Math.round((100 * r.decisionsMade) / total) : 0
              return (
                <li key={r.reviewerId} className="flex items-center justify-between gap-2 border-b border-line py-1 last:border-b-0">
                  <span className="text-fg">{r.reviewerName}</span>
                  <span className="font-mono text-xs text-mut">
                    {r.decisionsMade}/{total} · {pct}%
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-fg">{t('dashboard.conflictCount')}</h3>
          <p className="font-mono text-3xl font-bold text-fg">{conflictCount ?? '—'}</p>
          <Link to={`/projects/${project.id}/conflicts`} className="mt-2 inline-block text-sm text-include">
            {t('conflicts.title')} →
          </Link>
        </Card>
      </div>

      <AgreementCard projectId={project.id} stage={stage} />

      {project.settings.ai_screening_enabled && <AiScreeningCard projectId={project.id} stage={stage} />}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">{t('dashboard.prismaSnapshot')}</h3>
          <Link to={`/projects/${project.id}/prisma`} className="text-sm text-include">
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
