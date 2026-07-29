import type { ReactNode } from 'react'
import { useTranslation } from '@/i18n'
import { CentralDogmaViz } from '@/components/CentralDogmaViz'

const badgeKeys = [
  'auth.heroBadgeScreening',
  'auth.heroBadgeDedup',
  'auth.heroBadgePrisma',
  'auth.heroBadgeRob',
] as const

/**
 * Shared two-column shell for /login, /signup and /reset-password: a dark
 * hero panel on the left, echoing Biofor Devs' own identity (dark
 * background, green accent, the shared DNA→mRNA→protein diagram) without
 * copying it wholesale — softer, less neon palette, no terminal/code
 * decoration, since this is a research tool rather than a dev-education
 * product. Hidden below `lg` so the form alone fills small viewports.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0d1512] px-12 py-12 lg:flex lg:flex-col lg:justify-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#3ecf8e 1px, transparent 1px), linear-gradient(90deg, #3ecf8e 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-[-40px] top-0 flex w-[280px] items-center opacity-30"
          style={{
            maskImage: 'linear-gradient(to left, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to left, black 50%, transparent 100%)',
          }}
        >
          <CentralDogmaViz />
        </div>

        <div className="relative z-10 flex max-w-md flex-col gap-5">
          <h1 className="font-mono text-3xl font-bold leading-tight tracking-tight text-[#eef5f1] xl:text-4xl">
            Biofor Reviewers<span className="ml-1 text-[#3ecf8e]">_</span>
          </h1>
          <p className="font-mono text-base text-[#3ecf8e]">{t('auth.heroTagline')}</p>

          <p className="text-[15px] leading-relaxed text-[#9db3aa]">{t('auth.heroDescription')}</p>

          <div className="flex flex-wrap gap-2">
            {badgeKeys.map((key) => (
              <span key={key} className="border border-[#1f2e28] px-2.5 py-1 text-[11px] text-[#9db3aa]">
                {t(key)}
              </span>
            ))}
          </div>
        </div>

        <p className="relative z-10 mt-10 text-xs text-[#5c7169]">{t('footer.tagline')}</p>
      </div>

      <div className="flex flex-col justify-center bg-bg px-6 py-10">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
