import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ChevronLeftIcon, ChevronRightIcon, SplitIcon, ZapIcon } from '@/components/ui/icons'
import { normalizeTitle } from '@/domain/dedup/normalize'
import { jaroWinklerSimilarity } from '@/domain/dedup/jaroWinkler'
import { useDedupGroups, useDedupMutations } from './hooks'
import { AutoResolverModal } from './AutoResolverModal'
import type { DedupGroupSummary } from './api'

type GroupRecord = DedupGroupSummary['records'][number]

interface FieldRow {
  label: string
  value: (r: GroupRecord) => string
}

/**
 * Rayyan-style side-by-side duplicate comparer: steps through only the
 * not-yet-confirmed groups (mirrors Rayyan's "N Articles Left to Resolve"
 * countdown), highlights fields that diverge from the group's current
 * primary, and shows title similarity vs. that primary. Never deletes
 * records — "Manter este" just confirms which member stays the (visible,
 * non-duplicate) primary; "Não são duplicatas" splits every member back
 * into independent records.
 */
export function DedupResolutionWizard({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const { data: groups, isLoading } = useDedupGroups(projectId)
  const mutations = useDedupMutations(projectId)
  const [index, setIndex] = useState(0)
  const [autoResolverOpen, setAutoResolverOpen] = useState(false)

  const pending = (groups ?? []).filter((g) => !g.confirmed)
  const resolvedCount = (groups?.length ?? 0) - pending.length

  useEffect(() => {
    if (index > 0 && index >= pending.length) setIndex(Math.max(0, pending.length - 1))
  }, [pending.length, index])

  if (isLoading) return <p className="text-sm text-mut">{t('common.loading')}</p>

  if (!groups || groups.length === 0) {
    return <Card className="py-10 text-center text-sm text-mut">{t('duplicates.empty')}</Card>
  }

  const current = pending[index]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">
          {pending.length > 0
            ? t('dedupWizard.groupOf', { current: index + 1, total: pending.length })
            : t('dedupWizard.allResolved')}
        </h3>
        <Button variant="secondary" className="inline-flex items-center gap-1.5" onClick={() => setAutoResolverOpen(true)}>
          <ZapIcon className="h-4 w-4" /> {t('dedupWizard.autoResolve')}
        </Button>
      </div>

      {current && (
        <GroupComparison
          key={current.dedupGroupId}
          group={current}
          onKeep={(recordId) =>
            mutations.setPrimary.mutate({
              groupId: current.dedupGroupId,
              recordIds: current.records.map((r) => r.id),
              primaryId: recordId,
            })
          }
          onNotDuplicates={() => mutations.markNotDuplicate.mutate(current.records.map((r) => r.id))}
        />
      )}

      {pending.length > 0 && (
        <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
          <IconButton
            icon={<ChevronLeftIcon />}
            label={t('common.previous')}
            variant="ghost"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          />
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-mut">
              {t('dedupWizard.doneCount', { count: resolvedCount })} ·{' '}
              {t('dedupWizard.remaining', { count: pending.length })}
            </span>
            <div className="h-1.5 w-40 bg-line">
              <div
                className="h-1.5 bg-include"
                style={{ width: `${groups.length > 0 ? (100 * resolvedCount) / groups.length : 0}%` }}
              />
            </div>
          </div>
          <IconButton
            icon={<ChevronRightIcon />}
            label={t('common.next')}
            variant="ghost"
            disabled={index >= pending.length - 1}
            onClick={() => setIndex((i) => Math.min(pending.length - 1, i + 1))}
          />
        </div>
      )}

      <AutoResolverModal open={autoResolverOpen} onClose={() => setAutoResolverOpen(false)} projectId={projectId} />
    </div>
  )
}

function GroupComparison({
  group,
  onKeep,
  onNotDuplicates,
}: {
  group: DedupGroupSummary
  onKeep: (recordId: string) => void
  onNotDuplicates: () => void
}) {
  const { t } = useTranslation()
  // record_ids (and therefore group.records) are ordered primary-first by
  // v_dedup_groups, so [0] is always the reference column for the diff.
  const reference = group.records[0]

  const fields: FieldRow[] = [
    { label: t('dedupWizard.fieldTitle'), value: (r) => r.title || t('common.untitled') },
    { label: t('dedupWizard.fieldAuthors'), value: (r) => r.authors || '—' },
    { label: t('dedupWizard.fieldYear'), value: (r) => (r.year ? String(r.year) : '—') },
    { label: t('dedupWizard.fieldJournal'), value: (r) => r.journal || '—' },
    { label: t('dedupWizard.fieldDoi'), value: (r) => r.doi || '—' },
  ]

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-mut">
          {t('duplicates.groupLabel')} · {group.records.length}
        </span>
        <IconButton icon={<SplitIcon />} label={t('dedupWizard.notDuplicates')} variant="ghost" onClick={onNotDuplicates} />
      </div>

      <div
        className="grid gap-px border border-line bg-line overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${group.records.length}, minmax(220px, 1fr))` }}
      >
        {group.records.map((r) => {
          const similarity =
            r.id === reference.id
              ? null
              : Math.round(jaroWinklerSimilarity(normalizeTitle(reference.title), normalizeTitle(r.title)) * 100)
          return (
            <div key={r.id} className="flex flex-col bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={clsx(
                    'border px-2 py-0.5 text-[11px] font-semibold',
                    r.dedupPrimary ? 'border-include text-include' : 'border-line text-mut',
                  )}
                >
                  {r.dedupPrimary ? t('duplicates.primary') : t('duplicates.duplicate')}
                </span>
                {similarity !== null && (
                  <span className="text-[11px] text-mut">{t('dedupWizard.similarity', { value: similarity })}</span>
                )}
              </div>

              {fields.map((field) => {
                const value = field.value(r)
                const refValue = field.value(reference)
                const diverges = r.id !== reference.id && value !== refValue
                return (
                  <div key={field.label} className="border-t border-line py-1.5 first:border-t-0">
                    <p className="text-[11px] text-mut">{field.label}</p>
                    <p
                      className="text-sm text-fg"
                      style={
                        diverges
                          ? { backgroundColor: 'var(--color-hl-exclusion)', color: 'var(--color-hl-exclusion-fg)' }
                          : undefined
                      }
                    >
                      {value}
                    </p>
                  </div>
                )
              })}

              <Button
                variant={r.dedupPrimary ? 'primary' : 'secondary'}
                className="mt-3 self-start"
                onClick={() => onKeep(r.id)}
              >
                {r.dedupPrimary ? t('dedupWizard.confirmThis') : t('dedupWizard.keepThis')}
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
