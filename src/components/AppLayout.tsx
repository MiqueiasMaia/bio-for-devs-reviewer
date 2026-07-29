import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'
import { useTranslation } from '@/i18n'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/Logo'
import { Footer } from '@/components/Footer'
import { useCreateProjectDialogStore } from '@/features/projects/createProjectDialogStore'

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const setCreateProjectOpen = useCreateProjectDialogStore((s) => s.setOpen)
  const isProjectsRoute = pathname === '/projects'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/projects">
            <Logo />
          </Link>
          <div className="flex items-center gap-3 text-sm text-mut">
            {isProjectsRoute && (
              <Button onClick={() => setCreateProjectOpen(true)}>{t('projects.newProject')}</Button>
            )}
            <span className="hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
              {t('auth.signOut')}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      <Footer />
    </div>
  )
}
