import clsx from 'clsx'

const PALETTE = [
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-green-100 text-green-700',
]

function colorForSeed(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

/** Deterministic (same seed → same color, no state/randomness) initials avatar. */
export function Avatar({ seed, initials, className }: { seed: string; initials: string; className?: string }) {
  return (
    <span
      className={clsx(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        colorForSeed(seed),
        className,
      )}
    >
      {initials || '?'}
    </span>
  )
}
