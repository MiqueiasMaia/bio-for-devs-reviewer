import { forwardRef } from 'react'
import { useTranslation } from '@/i18n'
import type { PrismaCounts, ExclusionReasonCount } from './api'

const WIDTH = 900
const MAIN_X = 40
const MAIN_W = 460
const SIDE_X = 540
const SIDE_W = 320
const BOX_GAP = 46

interface Box {
  x: number
  y: number
  w: number
  h: number
  label: string
  count: number
  sublabel?: string
}

function measureHeight(lines: number): number {
  return 34 + lines * 16
}

function Rect({ box, tone = 'main' }: { box: Box; tone?: 'main' | 'side' }) {
  const fill = tone === 'main' ? '#eef4f6' : '#fbf6ee'
  const stroke = tone === 'main' ? '#1f6f8b' : '#d98b2b'
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={8}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <text x={box.x + 12} y={box.y + 20} fontSize={12.5} fontWeight={700} fill="#1a2733">
        {box.label}
      </text>
      <text x={box.x + 12} y={box.y + 38} fontSize={12.5} fill="#1a2733">
        n = {box.count}
      </text>
      {box.sublabel && (
        <text x={box.x + 12} y={box.y + 54} fontSize={11} fill="#5b6b7a">
          {box.sublabel}
        </text>
      )}
    </g>
  )
}

function VerticalArrow({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <line
      x1={x}
      y1={y1}
      x2={x}
      y2={y2}
      stroke="#5b6b7a"
      strokeWidth={1.5}
      markerEnd="url(#arrowhead)"
    />
  )
}

function HorizontalArrow({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <line x1={x1} y1={y} x2={x2} y2={y} stroke="#5b6b7a" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
  )
}

export const PrismaDiagram = forwardRef<SVGSVGElement, { counts: PrismaCounts; reasons: ExclusionReasonCount[] }>(
  function PrismaDiagram({ counts, reasons }, ref) {
    const { t } = useTranslation()

    const reasonsText = reasons.length
      ? reasons.map((r) => `${r.reasonCode} (${r.count})`).join('; ')
      : undefined

    const identified: Box = {
      x: MAIN_X,
      y: 20,
      w: MAIN_W,
      h: measureHeight(1),
      label: t('prisma.recordsIdentified'),
      count: counts.recordsIdentified,
    }
    const duplicates: Box = {
      x: SIDE_X,
      y: identified.y,
      w: SIDE_W,
      h: measureHeight(1),
      label: t('prisma.duplicatesRemoved'),
      count: counts.duplicatesRemoved,
    }

    const screenedY = identified.y + identified.h + BOX_GAP
    const screened: Box = {
      x: MAIN_X,
      y: screenedY,
      w: MAIN_W,
      h: measureHeight(1),
      label: t('prisma.recordsScreened'),
      count: counts.recordsScreenedTa,
    }
    const excludedTa: Box = {
      x: SIDE_X,
      y: screenedY,
      w: SIDE_W,
      h: measureHeight(1),
      label: t('prisma.recordsExcludedTa'),
      count: counts.excludedTa,
    }

    const fulltextY = screened.y + screened.h + BOX_GAP
    const fulltext: Box = {
      x: MAIN_X,
      y: fulltextY,
      w: MAIN_W,
      h: measureHeight(2),
      label: t('prisma.fulltextSought'),
      count: counts.fulltextSought,
      sublabel: `${t('prisma.fulltextAssessed')}: n = ${counts.fulltextAssessed}`,
    }
    const excludedFulltext: Box = {
      x: SIDE_X,
      y: fulltextY,
      w: SIDE_W,
      h: measureHeight(reasonsText ? 2 : 1),
      label: t('prisma.fulltextExcluded'),
      count: counts.excludedFulltext,
      sublabel: reasonsText,
    }

    const includedY = fulltext.y + fulltext.h + BOX_GAP
    const included: Box = {
      x: MAIN_X,
      y: includedY,
      w: MAIN_W,
      h: measureHeight(1),
      label: t('prisma.studiesIncluded'),
      count: counts.includedFinal,
    }

    const totalHeight = includedY + included.h + 20

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${WIDTH} ${totalHeight}`}
        width={WIDTH}
        height={totalHeight}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={t('prisma.title')}
        style={{ background: '#ffffff' }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#5b6b7a" />
          </marker>
        </defs>

        <Rect box={identified} />
        <Rect box={duplicates} tone="side" />
        <VerticalArrow x={MAIN_X + MAIN_W / 2} y1={identified.y + identified.h} y2={screened.y} />
        <HorizontalArrow x1={MAIN_X + MAIN_W} x2={SIDE_X} y={identified.y + identified.h / 2} />

        <Rect box={screened} />
        <Rect box={excludedTa} tone="side" />
        <VerticalArrow x={MAIN_X + MAIN_W / 2} y1={screened.y + screened.h} y2={fulltext.y} />
        <HorizontalArrow x1={MAIN_X + MAIN_W} x2={SIDE_X} y={screened.y + screened.h / 2} />

        <Rect box={fulltext} />
        <Rect box={excludedFulltext} tone="side" />
        <VerticalArrow x={MAIN_X + MAIN_W / 2} y1={fulltext.y + fulltext.h} y2={included.y} />
        <HorizontalArrow x1={MAIN_X + MAIN_W} x2={SIDE_X} y={fulltext.y + fulltext.h / 2} />

        <Rect box={included} />
      </svg>
    )
  },
)
