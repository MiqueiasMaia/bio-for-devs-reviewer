import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/Logo'

export function LoginPage() {
  const { t } = useTranslation()
  const { session, loading: authLoading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  if (!authLoading && session) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/projects'
    return <Navigate to={redirectTo} replace />
  }

  async function handlePasswordSignIn(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(t('auth.signInError'))
    setSubmitting(false)
  }

  async function handleMagicLink() {
    if (!email) return
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    if (error) setError(t('auth.signInError'))
    else setMagicLinkSent(true)
    setSubmitting(false)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="mb-6 flex justify-center">
        <Logo size="lg" />
      </div>
      <Card className="flex flex-col gap-4">
        <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4">
          <TextField
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {magicLinkSent && <p className="text-sm text-include">{t('auth.magicLinkSent')}</p>}
          <Button type="submit" disabled={submitting}>
            {t('auth.signIn')}
          </Button>
        </form>
        <div className="flex items-center gap-3 text-xs text-mut">
          <div className="h-px flex-1 bg-line" />
          {t('auth.orUsePassword')}
          <div className="h-px flex-1 bg-line" />
        </div>
        <Button variant="secondary" onClick={handleMagicLink} disabled={submitting || !email}>
          {t('auth.magicLink')}
        </Button>
      </Card>
      <p className="mt-4 text-center text-sm text-mut">
        {t('auth.noAccount')}{' '}
        <Link to="/signup" className="font-medium text-include">
          {t('auth.signUp')}
        </Link>
      </p>
    </div>
  )
}
