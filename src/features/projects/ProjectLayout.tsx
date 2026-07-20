import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { AppLayout } from '@/components/AppLayout'
import { Button } from '@/components/ui/Button'
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
  const { data: project, isLoading, isError } = useProject(projectId)
  const { t } = useTranslation()

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
          <NavLink to="conflicts" className={navLinkClass}>
            {t('projectNav.conflicts')}
          </NavLink>
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
