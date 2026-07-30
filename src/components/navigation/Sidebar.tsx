import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation, type TranslationKey } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { BioforMark } from '@/components/BioforMark'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { ChevronLeftIcon, ChevronRightIcon, LockIcon } from '@/components/ui/icons'
import { usePrismaCounts } from '@/features/prisma/hooks'
import { useOpenConflictCount } from '@/features/dashboard/hooks'
import { useDedupSummary } from '@/features/imports/hooks'
import type { ProjectDetail } from '@/features/projects/api'
import { globalModules, type GlobalModule, type NavContext, type NavItem } from './navConfig'
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

function ModuleRow({
  module,
  to,
  label,
  isActive,
  expanded,
  hasGroups,
  collapsed,
  onToggle,
}: {
  module: GlobalModule
  to: string
  label: string
  isActive: boolean
  expanded: boolean
  hasGroups: boolean
  collapsed: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const row = (
    <div
      className={clsx(
        'flex items-center gap-2.5 pr-1.5 transition-colors',
        collapsed ? 'justify-center py-2' : 'py-2 pl-2.5',
        isActive ? 'bg-fg text-white' : 'text-mut hover:bg-bg hover:text-fg',
      )}
    >
      <Link to={to} aria-current={isActive ? 'page' : undefined} className="flex min-w-0 flex-1 items-center gap-2.5">
        <module.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="truncate text-sm font-medium">{label}</span>}
      </Link>
      {!collapsed && hasGroups && (
        <button
          onClick={onToggle}
          aria-label={`${expanded ? t('sidebar.collapse') : t('sidebar.expand')} ${label}`}
          aria-expanded={expanded}
          className={clsx('shrink-0 rounded p-0.5', isActive ? 'hover:bg-white/20' : 'hover:bg-line/60')}
        >
          <ChevronRightIcon className={clsx('h-3.5 w-3.5 transition-transform duration-150', expanded && 'rotate-90')} />
        </button>
      )}
    </div>
  )

  return collapsed ? <Tooltip label={label}>{row}</Tooltip> : row
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
  const collapsed = useNavStore((s) => s.globalCollapsed)
  const toggleCollapsed = useNavStore((s) => s.toggleGlobalCollapsed)
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set())

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
          const hasGroups = Boolean(project) && Boolean(mod.groups) && mod.id !== 'reviews'
          const expanded = !collapsed && hasGroups && (isActive || manuallyExpanded.has(mod.id))

          return (
            <li key={mod.id}>
              <ModuleRow
                module={mod}
                to={to}
                label={label}
                isActive={isActive}
                expanded={expanded}
                hasGroups={hasGroups}
                collapsed={collapsed}
                onToggle={() => toggleModule(mod.id)}
              />
              {expanded && project && <ModuleGroups module={mod} project={project} isOwner={isOwner} />}
            </li>
          )
        })}
      </ul>

      <div className="border-t border-line p-2">
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          className="mb-2 flex w-full items-center justify-center py-1.5 text-mut hover:bg-bg hover:text-fg"
        >
          {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
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
