import { useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import type { ProjectOutletContext } from '@/features/projects/ProjectLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DownloadIcon } from '@/components/ui/icons'
import { ErrorState } from '@/components/ErrorState'
import { useFulltextExclusionReasons, usePrismaCounts } from './hooks'
import { PrismaDiagram } from './PrismaDiagram'
import { downloadCountsCsv, downloadPng, downloadSvg } from './export'

export function PrismaPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const { data: counts, isLoading, isError, refetch } = usePrismaCounts(project.id)
  const { data: reasons } = useFulltextExclusionReasons(project.id)
  const svgRef = useRef<SVGSVGElement>(null)

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />
  }

  if (isLoading || !counts) {
    return <p className="text-sm text-mut">{t('common.loading')}</p>
  }

  const rows = [
    { label: t('prisma.recordsIdentified'), count: counts.recordsIdentified },
    { label: t('prisma.duplicatesRemoved'), count: counts.duplicatesRemoved },
    { label: t('prisma.recordsScreened'), count: counts.recordsScreenedTa },
    { label: t('prisma.recordsExcludedTa'), count: counts.excludedTa },
    { label: t('prisma.fulltextSought'), count: counts.fulltextSought },
    { label: t('prisma.fulltextAssessed'), count: counts.fulltextAssessed },
    { label: t('prisma.fulltextExcluded'), count: counts.excludedFulltext },
    { label: t('prisma.studiesIncluded'), count: counts.includedFinal },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg">{t('prisma.title')}</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="inline-flex items-center gap-1.5"
            title={t('prisma.exportSvg')}
            aria-label={t('prisma.exportSvg')}
            onClick={() => svgRef.current && downloadSvg(svgRef.current, `prisma_${project.id.slice(0, 8)}.svg`)}
          >
            <DownloadIcon className="h-4 w-4" /> SVG
          </Button>
          <Button
            variant="secondary"
            className="inline-flex items-center gap-1.5"
            title={t('prisma.exportPng')}
            aria-label={t('prisma.exportPng')}
            onClick={() => svgRef.current && downloadPng(svgRef.current, `prisma_${project.id.slice(0, 8)}.png`)}
          >
            <DownloadIcon className="h-4 w-4" /> PNG
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <PrismaDiagram ref={svgRef} counts={counts} reasons={reasons ?? []} />
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">{t('prisma.countsTable')}</h3>
          <Button
            variant="ghost"
            onClick={() => downloadCountsCsv(`prisma_contagens_${project.id.slice(0, 8)}.csv`, rows)}
          >
            CSV
          </Button>
        </div>
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line last:border-b-0">
                <td className="py-1.5 pr-3 text-mut">{r.label}</td>
                <td className="py-1.5 text-right font-semibold text-fg">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
