import { useId, useState } from 'react'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchIcon } from '@/components/ui/icons'
import { useRunSnowballing } from './hooks'

export function SnowballingCard({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const runSnowballing = useRunSnowballing(projectId)
  const [batchSize, setBatchSize] = useState(5)
  const batchInputId = useId()

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-fg">{t('snowballing.title')}</h3>
        <p className="text-xs text-mut">{t('snowballing.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={batchInputId} className="text-sm font-medium text-fg">
          {t('snowballing.batchSize')}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={batchInputId}
            type="number"
            min={1}
            max={20}
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            className="w-20 border border-line px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-include"
          />
          <Button
            className="inline-flex items-center gap-1.5"
            onClick={() => runSnowballing.mutate(batchSize)}
            disabled={runSnowballing.isPending}
          >
            <SearchIcon className="h-4 w-4" /> {runSnowballing.isPending ? t('snowballing.running') : t('snowballing.run')}
          </Button>
        </div>
      </div>

      {runSnowballing.isError && <p className="text-sm text-red-600">{(runSnowballing.error as Error).message}</p>}
      {runSnowballing.isSuccess && runSnowballing.data.seedsProcessed === 0 && (
        <p className="text-sm text-mut">{t('snowballing.nothingToExpand')}</p>
      )}
      {runSnowballing.isSuccess && runSnowballing.data.seedsProcessed > 0 && (
        <p className="text-sm text-include">
          {runSnowballing.data.added > 0
            ? t('snowballing.doneSummaryWithResults', {
                seeds: runSnowballing.data.seedsProcessed,
                added: runSnowballing.data.added,
              })
            : t('snowballing.doneSummaryNoResults', { seeds: runSnowballing.data.seedsProcessed })}
        </p>
      )}
    </Card>
  )
}
