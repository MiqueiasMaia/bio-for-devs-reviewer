import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation, type TranslationKey } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'
import { useCreateProjectDialogStore } from '@/features/projects/createProjectDialogStore'
import { Logo } from '@/components/Logo'
import { BioforMark } from '@/components/BioforMark'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { ChevronRightIcon, LockIcon, PinIcon, PlusIcon } from '@/components/ui/icons'
import { usePrismaCounts } from '@/features/prisma/hooks'
import { useOpenConflictCount } from '@/features/dashboard/hooks'
import { useDedupSummary } from '@/features/imports/hooks'
import type { ProjectDetail } from '@/features/projects/api'
import {
  globalModules,
  resolveModuleItems,
  type GlobalModule,
  type NavContext,
  type NavItem,
  type StaticNavItem,
} from './navConfig'
import { useNavStore } from './navStore'

/** Badge values only make sense once a project is loaded — kept in their
 * own component (rather than a conditional hook call) so the hooks below
 * still run unconditionally within whichever component actually mounts. */
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
          className="flex cursor-not-allowed items-center justify-between py-1.5 pl-9 pr-3 text-sm text-mut opacity-50"
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

  return (
    <NavLink
      to={to}
      end
      title={locked ? t('stageLock.navLockedHint') : undefined}
      className={({ isActive }) =>
        clsx(
          'flex items-center justify-between gap-2 py-1.5 pl-9 pr-3 text-sm font-medium transition-colors',
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
}

function ModuleGroups({ module, project, isOwner }: { module: GlobalModule; project: ProjectDetail; isOwner: boolean }) {
  const { t } = useTranslation()
  const ctx: NavContext = { project, isOwner }
  const badges = useBadgeValues(project)
  const groups = module.groups?.(ctx) ?? []

  return (
    <div className="flex flex-col py-1">
      {groups.map((group, i) => (
        <div key={group.id} className={clsx(i > 0 && 'mt-2')}>
          {group.labelKey && (
            <p className="pb-1 pl-9 pr-3 text-[11px] font-semibold uppercase tracking-wide text-mut">
              {t(group.labelKey as TranslationKey)}
            </p>
          )}
          {group.items.map((item) => (
            <NavItemRow key={item.id} item={item} ctx={ctx} badges={badges} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Renders a module's `staticItems` (currently just Reviews' Active/Archived
 * and the "new review" action) — plain absolute links with no project
 * context, so active state is derived from the URL's search string rather
 * than `NavLink`'s pathname-only match. */
function StaticNavItems({ items }: { items: StaticNavItem[] }) {
  const { t } = useTranslation()
  const location = useLocation()
  const setWizardOpen = useCreateProjectDialogStore((s) => s.setOpen)

  return (
    <div className="flex flex-col py-1">
      {items.map((item) => {
        const label = t(item.labelKey as TranslationKey)

        if (item.action === 'create-review') {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setWizardOpen(true)}
              className="flex items-center gap-1.5 py-1.5 pl-9 pr-3 text-left text-sm font-medium text-mut hover:bg-bg hover:text-fg"
            >
              <PlusIcon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          )
        }

        const [path, query] = (item.to ?? '').split('?')
        const isActive = location.pathname === path && (location.search.replace(/^\?/, '') || '') === (query ?? '')
        return (
          <Link
            key={item.id}
            to={item.to ?? '#'}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'py-1.5 pl-9 pr-3 text-sm font-medium transition-colors',
              isActive ? 'bg-fg text-white' : 'text-mut hover:bg-bg hover:text-fg',
            )}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}

function ModuleRow({
  module,
  to,
  label,
  isActive,
  expanded,
  expandable,
  collapsed,
  onToggle,
}: {
  module: GlobalModule
  to: string
  label: string
  isActive: boolean
  expanded: boolean
  expandable: boolean
  collapsed: boolean
  onToggle: () => void
}) {
  const rowClass = clsx(
    'flex w-full items-center gap-2.5 py-2 transition-colors',
    collapsed ? 'justify-center' : 'justify-start pl-2.5 pr-1.5',
    isActive ? 'bg-fg text-white' : 'text-mut hover:bg-bg hover:text-fg',
  )
  const content = (
    <>
      <module.icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{label}</span>}
      {!collapsed && expandable && (
        <ChevronRightIcon className={clsx('h-3.5 w-3.5 shrink-0 transition-transform duration-150', expanded && 'rotate-90')} />
      )}
    </>
  )

  const row = expandable ? (
    <button type="button" onClick={onToggle} aria-expanded={expanded} aria-label={label} className={rowClass}>
      {content}
    </button>
  ) : (
    <Link to={to} aria-current={isActive ? 'page' : undefined} className={rowClass}>
      {content}
    </Link>
  )

  return collapsed ? (
    <Tooltip label={label} fullWidth>
      {row}
    </Tooltip>
  ) : (
    row
  )
}

export function Sidebar({
  projectId,
  project,
  isOwner,
  activeModuleId,
}: {
  projectId: string | undefined
  project: ProjectDetail | undefined
  isOwner: boolean
  activeModuleId: string
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const pinned = useNavStore((s) => s.pinned)
  const togglePinned = useNavStore((s) => s.togglePinned)
  const [hovering, setHovering] = useState(false)
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set())

  const collapsed = !pinned && !hovering
  const ctx: NavContext | undefined = project ? { project, isOwner } : undefined
  const modules = projectId ? globalModules : globalModules.filter((m) => !m.requiresProject)

  const toggleModule = (id: string) =>
    setManuallyExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <nav
      aria-label={t('sidebar.reviews')}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={clsx(
        'flex shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      <Link to="/projects" className="flex h-14 items-center justify-center border-b border-line px-2 text-include">
        {collapsed ? <BioforMark size={22} /> : <Logo />}
      </Link>

      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {modules.map((mod) => {
          const isActive = mod.id === 'reviews' ? !projectId : projectId != null && mod.id === activeModuleId
          const to = mod.id === 'reviews' || !projectId ? '/projects' : `/projects/${projectId}/${mod.to}`
          const label = t(mod.labelKey as TranslationKey)
          // A module is only worth expanding when it has more than one visible
          // sub-item — otherwise expanding it would just duplicate the row's
          // own label underneath (e.g. Overview, whose only "item" is itself).
          const groupItemCount = ctx && mod.groups ? resolveModuleItems(mod, ctx).length : 0
          const expandable = Boolean(mod.staticItems?.length) || groupItemCount > 1
          const expanded = !collapsed && expandable && (isActive || manuallyExpanded.has(mod.id))

          return (
            <li key={mod.id}>
              <ModuleRow
                module={mod}
                to={to}
                label={label}
                isActive={isActive}
                expanded={expanded}
                expandable={expandable}
                collapsed={collapsed}
                onToggle={() => toggleModule(mod.id)}
              />
              {expanded && mod.staticItems && <StaticNavItems items={mod.staticItems} />}
              {expanded && !mod.staticItems && project && <ModuleGroups module={mod} project={project} isOwner={isOwner} />}
            </li>
          )
        })}
      </ul>

      <div className="border-t border-line p-2">
        <button
          onClick={togglePinned}
          aria-label={pinned ? t('sidebar.unpin') : t('sidebar.pin')}
          aria-pressed={pinned}
          className={clsx(
            'mb-2 flex w-full items-center justify-center gap-1.5 py-1.5 text-sm',
            pinned ? 'text-include' : 'text-mut hover:bg-bg hover:text-fg',
          )}
        >
          <PinIcon className="h-4 w-4" />
          {!collapsed && <span>{pinned ? t('sidebar.unpin') : t('sidebar.pin')}</span>}
        </button>
        {collapsed ? (
          <div className="flex justify-center">
            <Tooltip label={`${user?.email ?? ''} · ${t('auth.signOut')}`}>
              <button
                onClick={() => supabase.auth.signOut()}
                aria-label={t('auth.signOut')}
                className="rounded-full transition-opacity hover:opacity-80"
              >
                <Avatar seed={user?.id ?? ''} initials={(user?.email ?? '?').slice(0, 2).toUpperCase()} />
              </button>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Avatar seed={user?.id ?? ''} initials={(user?.email ?? '?').slice(0, 2).toUpperCase()} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-mut">{user?.email}</p>
              <button onClick={() => supabase.auth.signOut()} className="text-xs font-medium text-fg hover:text-include">
                {t('auth.signOut')}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
