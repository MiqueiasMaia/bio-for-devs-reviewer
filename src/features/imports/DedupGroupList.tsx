import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useDedupGroups, useDedupMutations } from './hooks'
import type { DedupGroupSummary } from './api'

function DedupGroupCard({ projectId, group }: { projectId: string; group: DedupGroupSummary }) {
  const { t } = useTranslation()
  const mutations = useDedupMutations(projectId)
  const recordIds = group.records.map((r) => r.id)

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-mut">
        {t('duplicates.groupLabel')} · {group.records.length}
      </h3>
      {group.records.map((r) => (
        <div key={r.id} className="flex flex-col gap-2 border-b border-line py-2 last:border-b-0">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 shrink-0 border px-2 py-0.5 text-[11px] font-semibold ${
                r.dedupPrimary
                  ? 'border-include text-include'
                  : 'border-line text-mut'
              }`}
            >
              {r.dedupPrimary ? t('duplicates.primary') : t('duplicates.duplicate')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">{r.title || t('common.untitled')}</p>
              <p className="text-xs text-mut">
                {r.humanRef} · {r.authors || '—'} · {r.year ?? '—'} {r.doi ? `· ${r.doi}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
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

/** Shared between the standalone `/duplicates` route and the Overview
 * "Duplicatas" card's modal — one place owns the list+mutations. */
export function DedupGroupList({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const { data: groups, isLoading } = useDedupGroups(projectId)

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="text-sm text-mut">{t('common.loading')}</p>}
      {!isLoading && groups?.length === 0 && (
        <Card className="py-10 text-center text-sm text-mut">{t('duplicates.empty')}</Card>
      )}
      {groups?.map((group) => (
        <DedupGroupCard key={group.dedupGroupId} projectId={projectId} group={group} />
      ))}
    </div>
  )
}
