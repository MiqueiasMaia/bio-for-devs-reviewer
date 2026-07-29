import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useTranslation } from '@/i18n'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from './AuthLayout'

/**
 * Landing page for the link Supabase emails from resetPasswordForEmail.
 * Supabase's client auto-detects the recovery token in the URL and
 * establishes a (temporary, recovery-scoped) session before this component
 * mounts, so `useAuth()` already has a session here — no token parsing
 * needed. If someone opens this URL without a valid/unexpired recovery
 * link, there's simply no session, and we say so instead of showing a form
 * that would just fail.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!done) return
    const timer = setTimeout(() => navigate('/projects', { replace: true }), 1500)
    return () => clearTimeout(timer)
  }, [done, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(t('auth.resetError'))
    else setDone(true)
    setSubmitting(false)
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-5">
        {!loading && !session ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-600">{t('auth.invalidResetLink')}</p>
            <Link to="/login" className="text-sm font-medium text-include">
              {t('auth.backToLogin')}
            </Link>
          </div>
        ) : done ? (
          <p className="text-sm text-include">{t('auth.passwordUpdated')}</p>
        ) : (
          <>
            <h2 className="text-base font-semibold text-fg">{t('auth.newPasswordTitle')}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextField
                label={t('auth.newPassword')}
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <TextField
                label={t('auth.confirmPassword')}
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {t('auth.saveNewPassword')}
              </Button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
