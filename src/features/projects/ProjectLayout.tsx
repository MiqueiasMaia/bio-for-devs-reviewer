import { Link, Outlet, useParams } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/Button'
import { useProject } from './hooks'
import type { ProjectDetail } from './api'

export interface ProjectOutletContext {
  project: ProjectDetail
}

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading, isError } = useProject(projectId)
  const { t } = useTranslation()

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm font-medium text-red-700">{t('common.error')}</p>
        <Link to="/projects">
          <Button variant="secondary">{t('common.back')}</Button>
        </Link>
      </div>
    )
  }

  if (isLoading || !project) {
    return <p className="text-sm text-mut">{t('common.loading')}</p>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-fg">{project.name}</h1>
        {project.prosperoId && <p className="text-sm text-mut">PROSPERO: {project.prosperoId}</p>}
      </div>
      <Outlet context={{ project } satisfies ProjectOutletContext} />
    </div>
  )
}
