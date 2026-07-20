import { Fragment } from 'react'
import { highlightText, type HighlightTermSet } from '@/domain/highlight/highlight'

export function HighlightedText({
  text,
  termSets,
  enabled,
}: {
  text: string
  termSets: HighlightTermSet[]
  enabled: boolean
}) {
  if (!enabled) return <>{text}</>

  const segments = highlightText(text, termSets)
  return (
    <>
      {segments.map((seg, i) =>
        seg.category ? (
          <mark
            key={i}
            style={{ backgroundColor: seg.color ?? undefined }}
            className="rounded px-0.5 font-medium text-fg"
          >
            {seg.text}
          </mark>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </>
  )
}
