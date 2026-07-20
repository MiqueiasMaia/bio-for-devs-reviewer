interface ProgressRingProps {
  value: number
  total: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function ProgressRing({ value, total, size = 56, strokeWidth = 6, label }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = total > 0 ? Math.min(1, value / total) : 0
  const dashOffset = circumference * (1 - fraction)

  return (
    <div className="flex flex-col items-center gap-1" role="img" aria-label={label ?? `${value} de ${total}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-include)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-semibold text-fg">{value}/{total}</span>
      {label && <span className="text-[11px] text-mut">{label}</span>}
    </div>
  )
}
