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

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4.5" y="9" width="11" height="8" rx="1.4" />
      <path d="M6.8 9V6.8a3.2 3.2 0 0 1 6.4 0V9" />
    </svg>
  )
}

/** Generic (monochrome, currentColor) provider glyphs for the disabled
 * "coming soon" sign-in buttons — not brand-accurate logomarks, just
 * recognizable enough to read as "Google" / "GitHub" / "ORCID" at a glance. */
export function GoogleGlyphIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.17v2.98h5.4c-.23 1.42-1.6 4.16-5.4 4.16-3.25 0-5.9-2.69-5.9-6s2.65-6 5.9-6c1.85 0 3.09.79 3.8 1.47l2.6-2.5C16.98 3.4 14.9 2.5 12.18 2.5c-5.3 0-9.6 4.3-9.6 9.6s4.3 9.6 9.6 9.6c5.54 0 9.22-3.9 9.22-9.38 0-.63-.07-1.11-.05-1.62z"
      />
    </svg>
  )
}

export function GithubGlyphIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2z"
      />
    </svg>
  )
}

export function OrcidGlyphIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <text x="12" y="15.5" textAnchor="middle" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="currentColor">
        iD
      </text>
    </svg>
  )
}
