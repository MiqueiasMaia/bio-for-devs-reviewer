import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'include' | 'uncertain'
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-bg text-mut border-line',
  include: 'bg-include/10 text-include border-include/30',
  uncertain: 'bg-uncertain/10 text-uncertain border-uncertain/30',
}

/** Small counter/status pill for nav items (imported count, open conflicts,
 * stage progress) — same border+token convention as `Card`/`Button`, no new
 * colors introduced. */
export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex min-w-[1.25rem] items-center justify-center rounded-full border px-1.5 py-0.5 font-mono text-[11px] font-semibold leading-none',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
