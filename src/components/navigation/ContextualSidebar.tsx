import { Fragment } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation, type TranslationKey } from '@/i18n'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { ChevronLeftIcon, ChevronRightIcon, LockIcon } from '@/components/ui/icons'
import { usePrismaCounts } from '@/features/prisma/hooks'
import { useOpenConflictCount } from '@/features/dashboard/hooks'
import { useDedupSummary } from '@/features/imports/hooks'
import type { ProjectDetail } from '@/features/projects/api'
import type { GlobalModule, NavContext, NavItem } from './navConfig'
import { useNavStore } from './navStore'

function useBadgeValues(project: ProjectDetail) {
  const stage = project.settings.stages_enabled[0] ?? 'title_abstract'
  const { data: counts } = usePrismaCounts(project.id)
  const { data: conflictCount } = useOpenConflictCount(project.id, stage)
  const { data: dedupSummary } = useDedupSummary(project.id)

  return {
    imported: counts?.recordsIdentified,
    duplicates: dedupSummary?.unresolved,
    conflicts: conflictCount,
  } satisfies Record<NonNullable<NavItem['badgeKey']>, number | undefined>
}

function NavItemRow({ item, ctx, badges }: { item: NavItem; ctx: NavContext; badges: Record<string, number | undefined> }) {
  const { t } = useTranslation()
  const label = t(item.labelKey as TranslationKey)

  if (item.future) {
    return (
      <Tooltip label={t('sidebar.comingSoon')} side="top">
        <span
          aria-disabled="true"
          tabIndex={-1}
          className="flex cursor-not-allowed items-center justify-between px-3 py-2 text-sm text-mut opacity-50"
        >
          {label}
        </span>
      </Tooltip>
    )
  }

  if (item.isVisible && !item.isVisible(ctx)) return null

  const locked = item.isLocked?.(ctx) ?? false
  const badgeValue = item.badgeKey ? badges[item.badgeKey] : undefined
  const to = `/projects/${ctx.project.id}/${item.to}`

  const content = (
    <NavLink
      to={to}
      end
      title={locked ? t('stageLock.navLockedHint') : undefined}
      className={({ isActive }) =>
        clsx(
          'flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-fg text-white' : 'text-mut hover:bg-bg hover:text-fg',
        )
      }
    >
      <span className="flex items-center gap-1.5 truncate">
        {label}
        {locked && <LockIcon className="h-3 w-3 shrink-0 opacity-60" />}
      </span>
      {badgeValue !== undefined && <Badge>{badgeValue}</Badge>}
    </NavLink>
  )

  return content
}

export function ContextualSidebar({ module, project, isOwner }: { module: GlobalModule; project: ProjectDetail; isOwner: boolean }) {
  const { t } = useTranslation()
  const contextualCollapsed = useNavStore((s) => s.contextualCollapsed)
  const toggleContextualCollapsed = useNavStore((s) => s.toggleContextualCollapsed)
  const badges = useBadgeValues(project)

  if (contextualCollapsed) {
    return (
      <div className="flex w-8 shrink-0 flex-col items-center border-r border-line bg-white pt-2">
        <button
          onClick={toggleContextualCollapsed}
          aria-label={t('sidebar.expand')}
          className="p-1.5 text-mut hover:bg-bg hover:text-fg"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const ctx: NavContext = { project, isOwner }
  const groups = module.groups?.(ctx) ?? []

  return (
    <nav aria-label={t(module.labelKey as TranslationKey)} className="flex w-[280px] shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200">
      <div className="flex h-14 items-center justify-between border-b border-line px-4">
        <h2 className="truncate text-sm font-semibold text-fg">{t(module.labelKey as TranslationKey)}</h2>
        <button
          onClick={toggleContextualCollapsed}
          aria-label={t('sidebar.collapse')}
          className="p-1 text-mut hover:bg-bg hover:text-fg"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {groups.map((group, i) => (
          <Fragment key={group.id}>
            <div className={clsx('flex flex-col', i > 0 && 'mt-3 border-t border-line pt-3')}>
              {group.labelKey && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-mut">
                  {t(group.labelKey as TranslationKey)}
                </p>
              )}
              {group.items.map((item) => (
                <NavItemRow key={item.id} item={item} ctx={ctx} badges={badges} />
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    </nav>
  )
}
