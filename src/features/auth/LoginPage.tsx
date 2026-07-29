import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/Logo'
import { AuthLayout } from './AuthLayout'
import { ProviderButtons } from './ProviderButtons'

export function LoginPage() {
  const { t } = useTranslation()
  const { session, loading: authLoading } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<'signIn' | 'forgotPassword'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)

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

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(t('auth.resetError'))
    else setResetSent(true)
    setSubmitting(false)
  }

  function backToSignIn() {
    setMode('signIn')
    setError(null)
    setResetSent(false)
  }

  return (
    <AuthLayout>
      <div className="mb-8 flex justify-center">
        <Logo size="lg" />
      </div>

      <Card className="flex flex-col gap-5">
        {mode === 'forgotPassword' ? (
          <>
            <div>
              <h2 className="text-base font-semibold text-fg">{t('auth.resetTitle')}</h2>
              <p className="mt-1 text-sm text-mut">{t('auth.resetHint')}</p>
            </div>
            {resetSent ? (
              <p className="text-sm text-include">{t('auth.resetSent')}</p>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <TextField
                  label={t('auth.email')}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={submitting}>
                  {t('auth.resetSend')}
                </Button>
              </form>
            )}
            <button
              type="button"
              onClick={backToSignIn}
              className="cursor-pointer text-left text-sm text-mut hover:text-fg"
            >
              {t('auth.backToLogin')}
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-base font-semibold text-fg">{t('auth.welcomeBack')}</h2>
              <p className="mt-1 text-sm text-mut">{t('auth.welcomeBackSubtitle')}</p>
            </div>

            <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4">
              <TextField
                label={t('auth.email')}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <TextField
                  label={t('auth.password')}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setMode('forgotPassword')}
                  className="cursor-pointer self-end text-xs text-include hover:underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {magicLinkSent && <p className="text-sm text-include">{t('auth.magicLinkSent')}</p>}
              <Button type="submit" disabled={submitting}>
                {t('auth.signIn')}
              </Button>
            </form>

            <button
              type="button"
              onClick={handleMagicLink}
              disabled={submitting || !email}
              className="cursor-pointer text-center text-xs text-mut hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('auth.useMagicLinkInstead')}
            </button>

            <div className="flex items-center gap-3 text-xs text-mut">
              <div className="h-px flex-1 bg-line" />
              {t('auth.continueWith')}
              <div className="h-px flex-1 bg-line" />
            </div>
            <ProviderButtons />
          </>
        )}
      </Card>

      <p className="mt-4 text-center text-sm text-mut">
        {t('auth.noAccount')}{' '}
        <Link to="/signup" className="font-medium text-include">
          {t('auth.signUp')}
        </Link>
      </p>
    </AuthLayout>
  )
}
