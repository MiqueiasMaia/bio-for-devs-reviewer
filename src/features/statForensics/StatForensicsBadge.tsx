import { useTranslation } from '@/i18n'
import type { StatForensicsView } from './useStatForensics'

/** Non-blocking warning — see docs/pending-items.md §7.2. Deliberately not
 * the `Badge` component: that one is sized/styled for a short numeric
 * counter, not an explanatory sentence, so this reuses just its color
 * tokens (bg-uncertain/10, text-uncertain, border-uncertain/30). */
export function StatForensicsBadge({ view }: { view: StatForensicsView | null }) {
  const { t } = useTranslation()
  if (!view || !view.result.hasWarning) return null

  const details: string[] = []
  if (view.result.grim && !view.result.grim.consistent) {
    details.push(
      t('statForensics.grimDetail', {
        mean: view.values.mean ?? '',
        n: view.values.n ?? '',
        nearest: view.result.grim.nearestPossibleMean,
      }),
    )
  }
  if (view.result.sdRange && !view.result.sdRange.consistent) {
    details.push(
      t('statForensics.sdDetail', {
        sd: view.values.sd ?? '',
        min: view.result.sdRange.minSd.toFixed(2),
        max: view.result.sdRange.maxSd.toFixed(2),
      }),
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      <span className="inline-flex w-fit items-center border border-uncertain/30 bg-uncertain/10 px-2 py-1 text-xs font-semibold text-uncertain">
        {t('statForensics.badgeLabel')}
      </span>
      {details.map((detail, i) => (
        <p key={i} className="text-xs text-mut">
          {detail}
        </p>
      ))}
    </div>
  )
}
