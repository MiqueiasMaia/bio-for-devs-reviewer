/**
 * DNA double-helix mark shared with Biofor Devs — same geometry as that
 * project's favicon, rendered in `currentColor` so it can be recolored
 * per context (header, auth pages, favicon) via the surrounding text color.
 */
export function BioforMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <line x1="8" y1="4" x2="24" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      <line x1="11" y1="8" x2="21" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="8" y1="16" x2="24" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      <line x1="11" y1="24" x2="21" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="8" y1="28" x2="24" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      <path
        d="M 24,4 C 24,9 8,13 8,16 C 8,19 24,23 24,28"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path d="M 8,4 C 8,9 24,13 24,16 C 24,19 8,23 8,28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
