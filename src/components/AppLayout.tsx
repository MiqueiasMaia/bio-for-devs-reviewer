import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/Button'

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-white px-6 py-3">
        <Link to="/projects" className="text-sm font-semibold text-fg">
          {t('common.appName')}
        </Link>
        <div className="flex items-center gap-3 text-sm text-mut">
          <span>{user?.email}</span>
          <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
            {t('auth.signOut')}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
