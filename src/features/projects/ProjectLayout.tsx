import { NavLink, Outlet, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { AppLayout } from '@/components/AppLayout'
import { useProject } from './hooks'
import type { ProjectDetail } from './api'

export interface ProjectOutletContext {
  project: ProjectDetail
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'rounded-md px-3 py-1.5 text-sm font-medium',
    isActive ? 'bg-fg text-white' : 'text-mut hover:bg-bg',
  )

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading } = useProject(projectId)
  const { t } = useTranslation()

  if (isLoading || !project) {
    return (
      <AppLayout>
        <p className="text-sm text-mut">{t('common.loading')}</p>
      </AppLayout>
    )
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
          <NavLink to="import" className={navLinkClass}>
            {t('projectNav.import')}
          </NavLink>
          <NavLink to="duplicates" className={navLinkClass}>
            {t('projectNav.duplicates')}
          </NavLink>
          <NavLink to="screening" className={navLinkClass}>
            {t('projectNav.screening')}
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
