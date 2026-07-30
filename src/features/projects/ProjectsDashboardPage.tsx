import { Link, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { ErrorState } from '@/components/ErrorState'
import { useProjects } from './hooks'

export function ProjectsDashboardPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const archived = searchParams.get('archived') === '1'
  const { data: projects, isLoading, isError, refetch } = useProjects(archived)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{t('projects.title')}</h1>
        <p className="text-sm text-mut">{t('projects.subtitle')}</p>
      </div>

      <div className="mb-4 flex gap-1">
        <button
          onClick={() => setSearchParams({})}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium',
            !archived ? 'bg-fg text-white' : 'text-mut hover:bg-bg',
          )}
        >
          {t('projects.filterActive')}
        </button>
        <button
          onClick={() => setSearchParams({ archived: '1' })}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium',
            archived ? 'bg-fg text-white' : 'text-mut hover:bg-bg',
          )}
        >
          {t('projects.filterArchived')}
        </button>
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
        // correct at every column count without per-breakpoint math.
        // auto-fit (not a fixed sm:/lg: column count) collapses empty
        // tracks to zero width — with just 1-2 projects, the card(s)
        // stretch to fill the row instead of leaving blank reserved
        // columns showing the bg-line filler.
        <div className="grid gap-px border border-line bg-line grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
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
    </div>
  )
}
