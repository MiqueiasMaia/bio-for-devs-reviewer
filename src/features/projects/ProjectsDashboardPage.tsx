import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { AppLayout } from '@/components/AppLayout'
import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { ErrorState } from '@/components/ErrorState'
import { useProjects } from './hooks'
import { useCreateProjectDialogStore } from './createProjectDialogStore'
import { CreateProjectDialog } from './CreateProjectDialog'

export function ProjectsDashboardPage() {
  const { t } = useTranslation()
  const { data: projects, isLoading, isError, refetch } = useProjects()
  const wizardOpen = useCreateProjectDialogStore((s) => s.open)
  const setWizardOpen = useCreateProjectDialogStore((s) => s.setOpen)

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{t('projects.title')}</h1>
        <p className="text-sm text-mut">{t('projects.subtitle')}</p>
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
        // Shared 1px borders between cells (via gap-px on a bg-line
        // container) instead of separated, individually-bordered cards —
        // same "connected grid" look as the Biofor Devs site's audience
        // cards, done with grid gap instead of negative margins so it stays
        // correct at every column count (1/2/3) without per-breakpoint math.
        <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="flex h-full flex-col gap-4 bg-white p-6 transition-colors hover:bg-bg"
            >
              <div>
                <h2 className="font-semibold text-fg">{project.name}</h2>
                {project.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-mut">{project.description}</p>
                )}
                <span className="mt-2 inline-block border border-line px-2 py-0.5 text-[11px] text-mut">
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
            </Link>
          ))}
        </div>
      )}

      <CreateProjectDialog open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </AppLayout>
  )
}
