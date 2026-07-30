import { useId, useState } from 'react'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ZapIcon } from '@/components/ui/icons'
import type { ScreeningStage } from '@/types/domain'
import { useLastAiRunAt, useRescreenRoundInfo, useRunAiScreening, useUnscreenedCount } from './hooks'

export function AiScreeningCard({ projectId, stage }: { projectId: string; stage: ScreeningStage }) {
  const { t } = useTranslation()
  const { data: pendingCount } = useUnscreenedCount(projectId, stage)
  const { data: roundInfo } = useRescreenRoundInfo(projectId, stage)
  const { data: lastRunAt } = useLastAiRunAt(projectId, stage)
  const runScreening = useRunAiScreening(projectId, stage)
  const [batchSize, setBatchSize] = useState(10)
  const [includeAlreadyScreened, setIncludeAlreadyScreened] = useState(false)
  const batchInputId = useId()

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-fg">{t('aiScreening.title')}</h3>
        <p className="text-xs text-mut">{t('aiScreening.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-mut">{t('aiScreening.lastRunLabel')}</p>
          <p className="font-mono text-sm font-semibold text-fg">
            {lastRunAt
              ? new Date(lastRunAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
              : t('aiScreening.never')}
          </p>
        </div>
        <div>
          <p className="text-xs text-mut">{t('aiScreening.pendingLabel')}</p>
          <p className="font-mono text-lg font-semibold text-fg">{pendingCount ?? '—'}</p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-fg">
        <input
          type="checkbox"
          checked={includeAlreadyScreened}
          onChange={(e) => setIncludeAlreadyScreened(e.target.checked)}
        />
        {t('aiScreening.includeAlreadyScreened')}
      </label>

      {includeAlreadyScreened && roundInfo && (
        <p className="text-xs text-mut">
          {roundInfo.minCount === roundInfo.maxCount
            ? t('aiScreening.roundInfoEven', { count: roundInfo.minCount })
            : t('aiScreening.roundInfoUneven', { min: roundInfo.minCount, max: roundInfo.maxCount })}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={batchInputId} className="text-sm font-medium text-fg">
          {t('aiScreening.batchSize')}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={batchInputId}
            type="number"
            min={1}
            max={100}
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            className="w-20 border border-line px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-include"
          />
          <Button
            className="inline-flex items-center gap-1.5"
            onClick={() => runScreening.mutate({ limit: batchSize, includeAlreadyScreened })}
            disabled={runScreening.isPending || (pendingCount === 0 && !includeAlreadyScreened)}
          >
            <ZapIcon className="h-4 w-4" /> {runScreening.isPending ? t('aiScreening.running') : t('aiScreening.run')}
          </Button>
        </div>
      </div>

      {runScreening.isError && (
        <p className="text-sm text-red-600">{(runScreening.error as Error).message}</p>
      )}
      {runScreening.isSuccess && runScreening.data.length > 0 && (
        <p className="text-sm text-include">
          {t('aiScreening.doneSummary', {
            success: runScreening.data.filter((r) => !r.error).length,
            failed: runScreening.data.filter((r) => r.error).length,
          })}
        </p>
      )}
    </Card>
  )
}
