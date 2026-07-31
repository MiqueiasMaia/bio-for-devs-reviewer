import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation, type TranslationKey } from '@/i18n'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { CheckIcon, PlusIcon, SplitIcon } from '@/components/ui/icons'
import { usePrismaCounts } from '@/features/prisma/hooks'
import { useCriteria, useMembers } from './settings/hooks'
import type { ProjectDetail } from './api'

interface Step {
  key: string
  labelKey: TranslationKey
  done: boolean
  action?: ReactNode
}

function collapsedStorageKey(projectId: string) {
  return `getStartedWidgetCollapsed:${projectId}`
}

/**
 * Floating onboarding checklist for the project Overview page, in the spirit
 * of Rayyan's "Get started" widget — same interaction (collapsible floating
 * card, progress bar, per-step CTA), but built entirely from this app's own
 * square-cornered/white/green design system, not Rayyan's rounded dark card.
 * Every step's "done" state is derived from data that already exists
 * (imports, criteria, members) — nothing new is persisted except whether the
 * card itself is collapsed, kept in localStorage per project.
 */
export function GetStartedWidget({ project, onReviewDuplicates }: { project: ProjectDetail; onReviewDuplicates: () => void }) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(collapsedStorageKey(project.id)) === '1')

  const { data: counts } = usePrismaCounts(project.id)
  const { data: criteria } = useCriteria(project.id)
  const { data: members } = useMembers(project.id)

  const hasReferences = (counts?.recordsIdentified ?? 0) > 0
  const hasCriteria = (criteria?.length ?? 0) > 0
  const hasTeammates = (members?.length ?? 0) > 1

  const steps: Step[] = [
    { key: 'project', labelKey: 'getStarted.stepProjectCreated', done: true },
    {
      key: 'references',
      labelKey: 'getStarted.stepAddReferences',
      done: hasReferences,
      action: !hasReferences && (
        <Link to="import">
          <IconButton icon={<PlusIcon />} label={t('dashboard.addReferences')} />
        </Link>
      ),
    },
    {
      key: 'duplicates',
      labelKey: 'getStarted.stepDetectDuplicates',
      // Dedup runs automatically as part of every import, so "references
      // imported" doubles as "duplicates have been checked at least once" —
      // there's no separate manual detection step in this app.
      done: hasReferences,
      action: !hasReferences && (
        <IconButton icon={<SplitIcon />} label={t('dashboard.reviewDuplicates')} onClick={onReviewDuplicates} />
      ),
    },
    {
      key: 'criteria',
      labelKey: 'getStarted.stepDefineCriteria',
      done: hasCriteria,
      action: !hasCriteria && (
        <Link to="settings/criteria">
          <Button variant="secondary">{t('getStarted.actionDefineCriteria')}</Button>
        </Link>
      ),
    },
    {
      key: 'members',
      labelKey: 'getStarted.stepInviteMembers',
      done: hasTeammates,
      action: !hasTeammates && (
        <Link to="settings/members">
          <Button variant="secondary">{t('getStarted.actionInviteMembers')}</Button>
        </Link>
      ),
    },
  ]

  const doneCount = steps.filter((s) => s.done).length
  if (doneCount === steps.length) return null

  function setCollapsedPersisted(value: boolean) {
    setCollapsed(value)
    localStorage.setItem(collapsedStorageKey(project.id), value ? '1' : '0')
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsedPersisted(false)}
        className="fixed bottom-6 right-6 z-40 cursor-pointer border border-line bg-white px-3 py-2 text-xs font-semibold text-fg shadow-lg hover:bg-bg"
      >
        {t('getStarted.title')} {doneCount}/{steps.length}
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 border border-line bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold text-fg">{t('getStarted.title')}</h3>
        <button
          type="button"
          aria-label={t('getStarted.collapse')}
          onClick={() => setCollapsedPersisted(true)}
          className="cursor-pointer px-1 text-mut hover:text-fg"
        >
          −
        </button>
      </div>

      <div className="px-4 pt-3">
        <div className="h-1.5 bg-line">
          <div className="h-full bg-include transition-[width]" style={{ width: `${(100 * doneCount) / steps.length}%` }} />
        </div>
      </div>

      <ul className="flex flex-col gap-3 px-4 py-3">
        {steps.map((step) => (
          <li key={step.key} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={clsx(
                  'flex h-4 w-4 shrink-0 items-center justify-center border',
                  step.done ? 'border-include bg-include text-white' : 'border-line text-transparent',
                )}
              >
                <CheckIcon className="h-2.5 w-2.5" />
              </span>
              <span className={step.done ? 'text-mut line-through' : 'text-fg'}>{t(step.labelKey)}</span>
            </div>
            {step.action && <div className="ml-6">{step.action}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
