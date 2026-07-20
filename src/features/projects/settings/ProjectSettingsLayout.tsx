import { NavLink, Outlet, useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import type { ProjectOutletContext } from '../ProjectLayout'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium',
    isActive ? 'border-include text-include' : 'border-transparent text-mut hover:text-fg',
  )

export function ProjectSettingsLayout() {
  const { t } = useTranslation()
  const context = useOutletContext<ProjectOutletContext>()

  return (
    <div>
      <nav className="mb-6 flex gap-6 border-b border-line" aria-label={t('projectNav.settings')}>
        <NavLink to="general" className={tabClass}>
          {t('settingsNav.general')}
        </NavLink>
        <NavLink to="criteria" className={tabClass}>
          {t('settingsNav.criteria')}
        </NavLink>
        <NavLink to="picots" className={tabClass}>
          {t('settingsNav.picots')}
        </NavLink>
        <NavLink to="exclusion-reasons" className={tabClass}>
          {t('settingsNav.exclusionReasons')}
        </NavLink>
        <NavLink to="members" className={tabClass}>
          {t('settingsNav.members')}
        </NavLink>
      </nav>
      <Outlet context={context} />
    </div>
  )
}
