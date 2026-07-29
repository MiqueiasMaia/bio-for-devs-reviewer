import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'

/**
 * Sign In / Create Account switcher shown above the auth card, styled after
 * Directus Cloud's login screen — an underlined active tab rather than the
 * segmented-pill look, so it still reads as this app's flat, square-cornered
 * design language.
 */
export function AuthTabs({ active }: { active: 'signIn' | 'signUp' }) {
  const { t } = useTranslation()
  return (
    <div className="mb-6 flex gap-6 border-b border-line">
      <Link
        to="/login"
        className={clsx(
          '-mb-px border-b-2 pb-3 text-base font-semibold transition-colors',
          active === 'signIn' ? 'border-include text-fg' : 'border-transparent text-mut hover:text-fg',
        )}
      >
        {t('auth.signIn')}
      </Link>
      <Link
        to="/signup"
        className={clsx(
          '-mb-px border-b-2 pb-3 text-base font-semibold transition-colors',
          active === 'signUp' ? 'border-include text-fg' : 'border-transparent text-mut hover:text-fg',
        )}
      >
        {t('auth.signUp')}
      </Link>
    </div>
  )
}
