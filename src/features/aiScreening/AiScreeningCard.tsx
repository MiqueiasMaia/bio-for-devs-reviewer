import { useState } from 'react'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import type { ScreeningStage } from '@/types/domain'
import { useRunAiScreening, useUnscreenedCount } from './hooks'

export function AiScreeningCard({ projectId, stage }: { projectId: string; stage: ScreeningStage }) {
  const { t } = useTranslation()
  const { data: pendingCount } = useUnscreenedCount(projectId, stage)
  const runScreening = useRunAiScreening(projectId, stage)
  const [batchSize, setBatchSize] = useState(10)

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-fg">{t('aiScreening.title')}</h3>
        <p className="text-xs text-mut">{t('aiScreening.subtitle')}</p>
      </div>

      <p className="text-sm text-fg">
        {pendingCount === 0
          ? t('aiScreening.nothingPending')
          : t('aiScreening.pending', { count: pendingCount ?? 0 })}
      </p>

      <div className="flex items-end gap-2">
        <TextField
          label={t('aiScreening.batchSize')}
          type="number"
          min={1}
          max={100}
          value={batchSize}
          onChange={(e) => setBatchSize(Number(e.target.value))}
          className="max-w-32"
        />
        <Button
          onClick={() => runScreening.mutate(batchSize)}
          disabled={runScreening.isPending || pendingCount === 0}
        >
          {runScreening.isPending ? t('aiScreening.running') : t('aiScreening.run')}
        </Button>
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
