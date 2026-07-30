import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  /** Doubles as the accessible name (`aria-label`) and the hover tooltip text. */
  label: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  tooltipSide?: 'top' | 'right' | 'bottom'
}

/** Icon-only button with a built-in accessible name + hover tooltip, so
 * converting a text button to an icon never drops discoverability. */
export function IconButton({
  icon,
  label,
  variant = 'secondary',
  tooltipSide = 'top',
  className,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip label={label} side={tooltipSide}>
      <Button variant={variant} aria-label={label} className={clsx('p-2', className)} {...props}>
        {icon}
      </Button>
    </Tooltip>
  )
}
