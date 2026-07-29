import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { AppLayout } from '@/components/AppLayout'
import { Button } from '@/components/ui/Button'
import { LockIcon } from '@/components/ui/icons'
import { useAuth } from '@/features/auth/useAuth'
import { getApplicableStages, isStageUnlocked } from '@/domain/stageLock/stageLock'
import type { StageKey } from '@/types/domain'
import { useProject } from './hooks'
import type { ProjectDetail } from './api'

export interface ProjectOutletContext {
  project: ProjectDetail
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'px-3 py-1.5 text-sm font-medium',
    isActive ? 'bg-fg text-white' : 'text-mut hover:bg-bg',
  )

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading, isError } = useProject(projectId)
  const { t } = useTranslation()
  const { user } = useAuth()

  if (isError) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-medium text-red-700">{t('common.error')}</p>
          <Link to="/projects">
            <Button variant="secondary">{t('common.back')}</Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  if (isLoading || !project) {
    return (
      <AppLayout>
        <p className="text-sm text-mut">{t('common.loading')}</p>
      </AppLayout>
    )
  }

  const applicable = getApplicableStages(project.settings)
  const stageNavProps = (stage: StageKey) => {
    const locked = !isStageUnlocked(stage, project.settings.unlocked_stages, applicable)
    return { locked, title: locked ? t('stageLock.navLockedHint') : undefined }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-fg">{project.name}</h1>
        {project.prosperoId && (
          <p className="text-sm text-mut">PROSPERO: {project.prosperoId}</p>
        )}
        <nav className="mt-4 flex gap-2 border-b border-line pb-2">
          <NavLink to="" end className={navLinkClass}>
            {t('projectNav.overview')}
          </NavLink>
          {project.settings.stages_enabled.includes('title_abstract') && (
            <NavLink to="screening/title-abstract" className={navLinkClass} title={stageNavProps('title_abstract').title}>
              {t('screening.stageTitleAbstract')}
              {stageNavProps('title_abstract').locked && <LockIcon className="ml-1 inline h-3 w-3 opacity-60" />}
            </NavLink>
          )}
          {project.settings.stages_enabled.includes('full_text') && (
            <NavLink to="screening/full-text" className={navLinkClass} title={stageNavProps('full_text').title}>
              {t('screening.stageFullText')}
              {stageNavProps('full_text').locked && <LockIcon className="ml-1 inline h-3 w-3 opacity-60" />}
            </NavLink>
          )}
          <NavLink to="conflicts" className={navLinkClass} title={stageNavProps('conflicts').title}>
            {t('projectNav.conflicts')}
            {stageNavProps('conflicts').locked && <LockIcon className="ml-1 inline h-3 w-3 opacity-60" />}
          </NavLink>
          {project.settings.risk_of_bias_enabled && (
            <NavLink to="risk-of-bias" className={navLinkClass} title={stageNavProps('risk_of_bias').title}>
              {t('projectNav.riskOfBias')}
              {stageNavProps('risk_of_bias').locked && <LockIcon className="ml-1 inline h-3 w-3 opacity-60" />}
            </NavLink>
          )}
          {project.settings.data_extraction_enabled && (
            <NavLink to="data-extraction" className={navLinkClass} title={stageNavProps('data_extraction').title}>
              {t('projectNav.dataExtraction')}
              {stageNavProps('data_extraction').locked && <LockIcon className="ml-1 inline h-3 w-3 opacity-60" />}
            </NavLink>
          )}
          {project.ownerId === user?.id && (
            <NavLink to="ai-audit" className={navLinkClass}>
              {t('projectNav.aiAudit')}
            </NavLink>
          )}
          <NavLink to="prisma" className={navLinkClass}>
            {t('projectNav.prisma')}
          </NavLink>
          <NavLink to="settings" className={navLinkClass}>
            {t('projectNav.settings')}
          </NavLink>
        </nav>
      </div>
      <Outlet context={{ project } satisfies ProjectOutletContext} />
    </AppLayout>
  )
}
