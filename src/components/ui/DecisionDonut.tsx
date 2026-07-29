import { useTranslation } from '@/i18n'

interface DecisionDonutProps {
  include: number
  uncertain: number
  exclude: number
  undecided: number
  total: number
  size?: number
  strokeWidth?: number
}

/**
 * Rayyan-style segmented progress ring: one arc per decision (excluded /
 * uncertain / included), the remainder left as an unfilled (line-colored)
 * track for "left to screen" — plus a "% completed" readout in the center
 * and a count legend below, mirroring the two-view (reviewer/project)
 * donut the user referenced from Rayyan's screening dashboard.
 */
export function DecisionDonut({
  include,
  uncertain,
  exclude,
  undecided,
  total,
  size = 140,
  strokeWidth = 16,
}: DecisionDonutProps) {
  const { t } = useTranslation()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const decided = include + uncertain + exclude
  const pct = total > 0 ? Math.round((100 * decided) / total) : 0

  const segments = [
    { key: 'exclude', value: exclude, color: 'var(--color-exclude)' },
    { key: 'uncertain', value: uncertain, color: 'var(--color-uncertain)' },
    { key: 'include', value: include, color: 'var(--color-include)' },
  ] as const

  let cumulative = 0

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            segments.map((seg) => {
              if (seg.value === 0) return null
              const dash = (seg.value / total) * circumference
              const dashOffset = -cumulative
              cumulative += dash
              return (
                <circle
                  key={seg.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={dashOffset}
                />
              )
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold text-fg">{pct}%</span>
          <span className="text-[11px] text-mut">{t('progress.completed')}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        <LegendItem color="var(--color-include)" label={t('screening.include')} value={include} />
        <LegendItem color="var(--color-uncertain)" label={t('screening.uncertain')} value={uncertain} />
        <LegendItem color="var(--color-exclude)" label={t('screening.exclude')} value={exclude} />
        <LegendItem color="var(--color-line)" label={t('progress.left')} value={undecided} />
      </div>
    </div>
  )
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5" style={{ backgroundColor: color }} />
      <span className="text-mut">{label}</span>
      <span className="font-mono font-semibold text-fg">{value}</span>
    </span>
  )
}
