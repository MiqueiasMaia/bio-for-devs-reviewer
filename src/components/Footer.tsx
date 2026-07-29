import { useTranslation } from '@/i18n'
import { BioforMark } from './BioforMark'

/** Mirrors the Biofor Devs site footer: brand wordmark + tagline on one
 * side, "made by" credit on the other, bold brand type, square/bordered —
 * no rounded corners, no shadow. */
export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-6 text-xs text-mut sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col items-center gap-1.5 sm:items-start">
          <span className="inline-flex items-center gap-1.5 font-brand text-sm font-bold text-include">
            <BioforMark size={16} />
            {t('common.appName')}_
          </span>
          <p className="font-brand">{t('footer.tagline')}</p>
        </div>
        <span className="font-brand">
          {t('footer.madeBy')} <span className="text-fg">{t('footer.author')}</span>
        </span>
      </div>
    </footer>
  )
}
