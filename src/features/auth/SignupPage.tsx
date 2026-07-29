import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useTranslation } from '@/i18n'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from './AuthLayout'
import { AuthTabs } from './AuthTabs'
import { ProviderButtons } from './ProviderButtons'

export function SignupPage() {
  const { t } = useTranslation()
  const { session, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!authLoading && session) return <Navigate to="/projects" replace />

  async function handleSignUp(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        // Always redirect back to wherever this app is actually being
        // served from (localhost during dev, the real domain in prod)
        // instead of relying on the dashboard's single static Site URL.
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) setError(t('auth.signUpError'))
    else setSuccess(true)
    setSubmitting(false)
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-5">
        {success ? (
          <>
            <AuthTabs active="signUp" />
            <p className="text-sm text-include">{t('auth.checkYourEmail')}</p>
          </>
        ) : (
          <>
            <AuthTabs active="signUp" />

            <div>
              <h2 className="text-base font-semibold text-fg">{t('auth.createAccountTitle')}</h2>
              <p className="mt-1 text-sm text-mut">{t('auth.createAccountSubtitle')}</p>
            </div>
            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
              <TextField
                label="Nome"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
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
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {t('auth.signUp')}
              </Button>
            </form>

            <div className="flex items-center gap-3 text-xs text-mut">
              <div className="h-px flex-1 bg-line" />
              {t('auth.continueWith')}
              <div className="h-px flex-1 bg-line" />
            </div>
            <ProviderButtons />
          </>
        )}
      </div>
    </AuthLayout>
  )
}
