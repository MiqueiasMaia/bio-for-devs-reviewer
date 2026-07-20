import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { AppLayout } from '@/components/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { ErrorState } from '@/components/ErrorState'
import { useProjects } from './hooks'
import { CreateProjectDialog } from './CreateProjectDialog'

export function ProjectsDashboardPage() {
  const { t } = useTranslation()
  const { data: projects, isLoading, isError, refetch } = useProjects()
  const [wizardOpen, setWizardOpen] = useState(false)

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('projects.title')}</h1>
          <p className="text-sm text-mut">{t('projects.subtitle')}</p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>{t('projects.newProject')}</Button>
      </div>

      {isError && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <p className="text-sm text-mut">{t('common.loading')}</p>}

      {!isLoading && !isError && projects?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-medium text-fg">{t('projects.empty')}</p>
          <p className="text-sm text-mut">{t('projects.emptyHint')}</p>
        </Card>
      )}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="flex h-full flex-col gap-4 transition-shadow hover:shadow-md">
                <div>
                  <h2 className="font-semibold text-fg">{project.name}</h2>
                  {project.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-mut">{project.description}</p>
                  )}
                  <span className="mt-2 inline-block rounded-full border border-line px-2 py-0.5 text-[11px] text-mut">
                    {t(`projects.role_${project.role}`)}
                  </span>
                </div>
                <div className="mt-auto flex justify-around gap-2 border-t border-line pt-4">
                  <ProgressRing
                    value={project.counts.identified}
                    total={Math.max(project.counts.identified, 1)}
                    label={t('projects.identified')}
                  />
                  <ProgressRing
                    value={project.counts.screened}
                    total={Math.max(project.counts.identified, 1)}
                    label={t('projects.screened')}
                  />
                  <ProgressRing
                    value={project.counts.included}
                    total={Math.max(project.counts.identified, 1)}
                    label={t('projects.included')}
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectDialog open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </AppLayout>
  )
}
