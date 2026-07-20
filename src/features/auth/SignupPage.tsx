import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'

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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-6 text-center text-lg font-semibold">{t('common.appName')}</h1>
      <Card className="flex flex-col gap-4">
        {success ? (
          <p className="text-sm text-include">{t('auth.checkYourEmail')}</p>
        ) : (
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
        )}
      </Card>
      <p className="mt-4 text-center text-sm text-mut">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-include">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  )
}
