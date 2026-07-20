import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import type { ProjectOutletContext } from '@/features/projects/ProjectLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useDedupGroups, useDedupMutations } from './hooks'
import type { DedupGroupSummary } from './api'

function DedupGroupCard({ group }: { group: DedupGroupSummary }) {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const mutations = useDedupMutations(project.id)
  const recordIds = group.records.map((r) => r.id)

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-mut">
        {t('duplicates.groupLabel')} · {group.records.length}
      </h3>
      {group.records.map((r) => (
        <div
          key={r.id}
          className="flex items-start gap-3 border-b border-line py-2 last:border-b-0"
        >
          <span
            className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              r.dedupPrimary
                ? 'border-include text-include'
                : 'border-line text-mut'
            }`}
          >
            {r.dedupPrimary ? t('duplicates.primary') : t('duplicates.duplicate')}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-fg">{r.title || '(sem título)'}</p>
            <p className="text-xs text-mut">
              {r.humanRef} · {r.authors || '—'} · {r.year ?? '—'} {r.doi ? `· ${r.doi}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!r.dedupPrimary && (
              <Button
                variant="secondary"
                onClick={() =>
                  mutations.setPrimary.mutate({ groupId: group.dedupGroupId, recordIds, primaryId: r.id })
                }
              >
                {t('duplicates.makePrimary')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => mutations.split.mutate(r.id)}>
              {t('duplicates.split')}
            </Button>
          </div>
        </div>
      ))}
    </Card>
  )
}

export function DedupReviewPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const { data: groups, isLoading } = useDedupGroups(project.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('duplicates.title')}</h2>
        <p className="text-sm text-mut">{t('duplicates.subtitle')}</p>
      </div>

      {isLoading && <p className="text-sm text-mut">{t('common.loading')}</p>}

      {!isLoading && groups?.length === 0 && (
        <Card className="py-10 text-center text-sm text-mut">{t('duplicates.empty')}</Card>
      )}

      {groups?.map((group) => (
        <DedupGroupCard key={group.dedupGroupId} group={group} />
      ))}
    </div>
  )
}
