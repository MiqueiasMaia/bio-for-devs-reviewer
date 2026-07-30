import { useId, useState, type ReactNode } from 'react'
import clsx from 'clsx'

/** Minimal hover/focus tooltip — no portal/positioning library, just an
 * absolutely-positioned panel next to the trigger. Good enough for short
 * single-line labels in the sidebar rail (collapsed module names, "Em
 * breve" hints), matching the project's no-dependency `ui/` convention. */
export function Tooltip({
  label,
  side = 'right',
  fullWidth = false,
  children,
}: {
  label: string
  side?: 'right' | 'top' | 'bottom'
  /** Stretch the wrapper to its container's width instead of shrink-wrapping
   * to the trigger's content — needed when the trigger itself relies on
   * `w-full` to center/lay out within a block-level ancestor (e.g. a
   * full-width sidebar row), since `inline-flex` alone won't hand that
   * width down. */
  fullWidth?: boolean
  children: ReactNode
}) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  return (
    <span
      className={clsx('relative inline-flex', fullWidth && 'w-full')}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <span
        role="tooltip"
        id={id}
        className={clsx(
          'pointer-events-none absolute z-20 whitespace-nowrap border border-line bg-fg px-2 py-1 text-xs font-medium text-white transition-opacity duration-150',
          side === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2',
          side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
          side === 'bottom' && 'top-full left-1/2 mt-2 -translate-x-1/2',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        {label}
      </span>
    </span>
  )
}
