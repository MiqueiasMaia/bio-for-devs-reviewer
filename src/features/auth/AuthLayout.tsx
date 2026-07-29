import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { BioforMark } from '@/components/BioforMark'

const badgeKeys = [
  'auth.heroBadgeScreening',
  'auth.heroBadgeAi',
  'auth.heroBadgeDedup',
  'auth.heroBadgePrisma',
  'auth.heroBadgeRob',
] as const

const slides = [
  { title: 'auth.heroSlide1Title', body: 'auth.heroSlide1Body' },
  { title: 'auth.heroSlide2Title', body: 'auth.heroSlide2Body' },
  { title: 'auth.heroSlide3Title', body: 'auth.heroSlide3Body' },
  { title: 'auth.heroSlide4Title', body: 'auth.heroSlide4Body' },
] as const

const SLIDE_INTERVAL_MS = 5000
const FADE_MS = 250

/**
 * Split-screen shell for /login, /signup and /reset-password: a dark hero
 * panel (~65% wide) using this app's own auth-page palette (already
 * established here before this component existed — not a new identity),
 * with the real dashboard screenshot as the hero's centerpiece next to the
 * feature copy, and a plain sign-in panel (~35%) reusing the app's existing
 * Card/TextField/Button — square corners throughout, no invented shapes or
 * colors. The whole page targets one viewport height (no scroll): the hero
 * row is vertically centered between the logo and footer rather than
 * stacking image-then-text, which is what let it grow taller than 100vh
 * before. Hero is hidden below `md`; a compact reduced-mockup strip stands
 * in on narrow/mobile viewports so the real UI is still visible before the
 * form.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [slide, setSlide] = useState(0)
  const [visible, setVisible] = useState(true)

  function goTo(index: number) {
    setVisible(false)
    setTimeout(() => {
      setSlide(index)
      setVisible(true)
    }, FADE_MS)
  }

  useEffect(() => {
    const id = setInterval(() => goTo((slide + 1) % slides.length), SLIDE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [slide])

  return (
    <div className="grid h-screen md:grid-cols-[58%_42%] lg:grid-cols-[65%_35%]">
      <div className="relative hidden overflow-hidden bg-[#0d1512] px-10 py-8 md:flex md:flex-col lg:px-14 lg:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#3ecf8e 1px, transparent 1px), linear-gradient(90deg, #3ecf8e 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[780px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, #3ecf8e 18%, transparent), transparent)' }}
        />

        {/* 1. Logo — top-left, generous negative space around it. */}
        <div className="relative z-10 flex shrink-0 items-center gap-2 text-[#3ecf8e]">
          <BioforMark size={22} />
          <span className="font-brand text-sm font-bold tracking-tight text-[#eef5f1]">Biofor Reviewers</span>
        </div>

        {/* Feature copy and mockup side by side, vertically centered in the
            remaining space — keeps the whole page within one viewport
            height instead of stacking them (which pushed the page taller). */}
        <div className="relative z-10 flex min-h-0 flex-1 items-center gap-8">
          {/* 3. Institutional content. */}
          <div className="flex w-[44%] shrink-0 flex-col gap-4">
            <div
              className={clsx('flex flex-col gap-2 transition-opacity ease-out', visible ? 'opacity-100' : 'opacity-0')}
              style={{ transitionDuration: `${FADE_MS}ms` }}
            >
              {/* Fixed heights (not min-height) — slide bodies run 2 to 4
                  lines, and without a hard cap the badges/dots below kept
                  drifting up and down as the carousel advanced. */}
              <h1 className="h-[64px] overflow-hidden text-2xl font-bold leading-tight text-[#eef5f1] xl:text-[28px]">
                {t(slides[slide].title)}
              </h1>
              <p className="h-[100px] overflow-hidden text-[15px] leading-relaxed text-[#9db3aa]">
                {t(slides[slide].body)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {badgeKeys.map((key) => (
                <span key={key} className="border border-[#1f2e28] px-2.5 py-1 text-[11px] text-[#9db3aa]">
                  {t(key)}
                </span>
              ))}
            </div>

            {/* 4. Indicators — discrete, square-edged (no rounded-full) to
                match the app's flat visual language. */}
            <div className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={clsx(
                    'h-1 transition-all',
                    i === slide ? 'w-6 bg-[#3ecf8e]' : 'w-3 bg-[#1f2e28] hover:bg-[#2a3d34]',
                  )}
                />
              ))}
            </div>
          </div>

          {/* 2. Mockup — the hero's main element: the real dashboard, shown at
              its native aspect ratio (no crop, no stretch). Wider than its
              own column and pulled right via a negative margin, so its right
              edge spills past the panel edge — clipped by this panel's
              overflow-hidden — with a browser-chrome title bar above it.
              Shadow is deliberately restrained. */}
          <div className="min-w-0 flex-1 self-center">
            <div className="ml-auto w-[185%] max-w-3xl -mr-[85%] border border-[#1f2e28] shadow-md">
              <div className="flex items-center gap-1.5 border-b border-[#1f2e28] bg-[#101d17] px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-[#2a3d34]" />
                <span className="h-2 w-2 rounded-full bg-[#2a3d34]" />
                <span className="h-2 w-2 rounded-full bg-[#2a3d34]" />
              </div>
              <img src="/screenshots/dashboard-preview.png" alt="" className="block w-full" />
            </div>
          </div>
        </div>

        <p className="relative z-10 shrink-0 pt-6 text-xs text-[#5c7169]">{t('footer.tagline')}</p>
      </div>

      {/* Compact hero strip for mobile — reduced mockup, no carousel/copy,
          keeps the real UI visible while prioritizing the auth form. */}
      <div className="flex flex-col items-center gap-3 border-b border-line bg-[#0d1512] px-6 py-6 md:hidden">
        <div className="flex items-center gap-2 text-[#3ecf8e]">
          <BioforMark size={18} />
          <span className="font-brand text-xs font-bold tracking-tight text-[#eef5f1]">Biofor Reviewers</span>
        </div>
        <img src="/screenshots/dashboard-preview.png" alt="" className="w-full max-w-xs border border-[#1f2e28] shadow-md" />
      </div>

      <div className="flex flex-col justify-center overflow-y-auto bg-white px-6 py-10">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
