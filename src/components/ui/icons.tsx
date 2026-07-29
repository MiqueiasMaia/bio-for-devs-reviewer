/** Small, dependency-free stroke icons for icon-only buttons (import/export,
 * open-access search, PDF upload). Use `currentColor` so they inherit the
 * button's text color automatically across variants. */
interface IconProps {
  className?: string
}

const shared = {
  viewBox: '0 0 20 20',
  width: 16,
  height: 16,
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M10 12.5V3.5M6.2 7.3 10 3.5l3.8 3.8M4 14.5v1.2c0 .72.58 1.3 1.3 1.3h9.4c.72 0 1.3-.58 1.3-1.3v-1.2" />
    </svg>
  )
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M10 3.5v9M6.2 9.2 10 13l3.8-3.8M4 14.5v1.2c0 .72.58 1.3 1.3 1.3h9.4c.72 0 1.3-.58 1.3-1.3v-1.2" />
    </svg>
  )
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="m16 16-3.8-3.8" />
    </svg>
  )
}
