import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { BioforMark } from '@/components/BioforMark'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'
import { globalModules } from './navConfig'
import { useNavStore } from './navStore'
import type { TranslationKey } from '@/i18n'

export function GlobalSidebar({
  projectId,
  activeModuleId,
}: {
  projectId: string | undefined
  activeModuleId: string
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const globalCollapsed = useNavStore((s) => s.globalCollapsed)
  const toggleGlobalCollapsed = useNavStore((s) => s.toggleGlobalCollapsed)

  const modules = projectId ? globalModules : globalModules.filter((m) => !m.requiresProject)

  return (
    <nav
      aria-label={t('sidebar.reviews')}
      className={clsx(
        'flex shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200',
        globalCollapsed ? 'w-[72px]' : 'w-[200px]',
      )}
    >
      <Link to="/projects" className="flex h-14 items-center justify-center border-b border-line px-2 text-include">
        {globalCollapsed ? <BioforMark size={22} /> : <Logo />}
      </Link>

      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {modules.map((mod) => {
          const isActive = mod.id === 'reviews' ? !projectId : projectId != null && mod.id === activeModuleId
          const to = mod.id === 'reviews' || !projectId ? '/projects' : `/projects/${projectId}/${mod.to}`
          const label = t(mod.labelKey as TranslationKey)
          const item = (
            <Link
              to={to}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-fg text-white' : 'text-mut hover:bg-bg hover:text-fg',
              )}
            >
              <mod.icon className="h-5 w-5 shrink-0" />
              {!globalCollapsed && <span className="truncate">{label}</span>}
            </Link>
          )
          return (
            <li key={mod.id}>
              {globalCollapsed ? <Tooltip label={label}>{item}</Tooltip> : item}
            </li>
          )
        })}
      </ul>

      <div className="border-t border-line p-2">
        <button
          onClick={toggleGlobalCollapsed}
          aria-label={globalCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          className="mb-2 flex w-full items-center justify-center py-1.5 text-mut hover:bg-bg hover:text-fg"
        >
          {globalCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
        </button>
        {globalCollapsed ? (
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
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs font-medium text-fg hover:text-include"
              >
                {t('auth.signOut')}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
