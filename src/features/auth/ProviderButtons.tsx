import type { ReactNode } from 'react'
import { useTranslation } from '@/i18n'
import { GithubGlyphIcon, GoogleGlyphIcon, OrcidGlyphIcon } from '@/components/ui/icons'

/**
 * Third-party sign-in isn't implemented yet — a single compact row of
 * disabled icon buttons shows the eventual shape of the auth screen
 * without the vertical weight of three full labeled rows, and without
 * pretending it already works.
 */
function ProviderIconButton({ icon, label }: { icon: ReactNode; label: string }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      disabled
      title={`${label} — ${t('auth.comingSoon')}`}
      aria-label={label}
      className="flex flex-1 cursor-not-allowed items-center justify-center border border-line bg-white py-2.5 text-mut opacity-60"
    >
      {icon}
    </button>
  )
}

export function ProviderButtons() {
  const { t } = useTranslation()
  return (
    <div className="flex gap-2">
      <ProviderIconButton icon={<GoogleGlyphIcon />} label={t('auth.continueWithGoogle')} />
      <ProviderIconButton icon={<GithubGlyphIcon />} label={t('auth.continueWithGithub')} />
      <ProviderIconButton icon={<OrcidGlyphIcon />} label={t('auth.continueWithOrcid')} />
    </div>
  )
}
