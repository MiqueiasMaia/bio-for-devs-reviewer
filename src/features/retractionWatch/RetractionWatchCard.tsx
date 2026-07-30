import { useId, useState } from 'react'
import clsx from 'clsx'
import { useTranslation, type TranslationKey } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchIcon } from '@/components/ui/icons'
import { useRetractionSummary, useRunRetractionCheck } from './hooks'

export function RetractionWatchCard({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const { data: summary } = useRetractionSummary(projectId)
  const runCheck = useRunRetractionCheck(projectId)
  const [batchSize, setBatchSize] = useState(20)
  const batchInputId = useId()

  const flaggedCount = summary?.flagged.length ?? 0

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-fg">{t('retractionWatch.title')}</h3>
        <p className="text-xs text-mut">{t('retractionWatch.subtitle')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-mut">{t('retractionWatch.includedLabel')}</p>
          <p className="font-mono text-lg font-semibold text-fg">{summary?.totalIncludedWithDoi ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-mut">{t('retractionWatch.checkedLabel')}</p>
          <p className="font-mono text-lg font-semibold text-fg">{summary?.checkedCount ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-mut">{t('retractionWatch.flaggedLabel')}</p>
          <p className={clsx('font-mono text-lg font-semibold', flaggedCount > 0 ? 'text-red-700' : 'text-fg')}>
            {summary ? flaggedCount : '—'}
          </p>
        </div>
      </div>

      {flaggedCount > 0 && (
        <ul className="flex flex-col gap-1.5">
          {summary!.flagged.map((f) => (
            <li key={f.id} className="border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs">
              <span className="font-semibold text-red-700">
                {t(`retractionWatch.status_${f.status}` as TranslationKey)}
              </span>
              {' — '}
              <span className="text-fg">
                {f.humanRef} · {f.title || t('common.untitled')}
              </span>
              {f.noticeDoi && (
                <>
                  {' · '}
                  <a
                    href={`https://doi.org/${f.noticeDoi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-700 underline"
                  >
                    {t('retractionWatch.viewNotice')}
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={batchInputId} className="text-sm font-medium text-fg">
          {t('retractionWatch.batchSize')}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={batchInputId}
            type="number"
            min={1}
            max={50}
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            className="w-20 border border-line px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-include"
          />
          <Button
            className="inline-flex items-center gap-1.5"
            onClick={() => runCheck.mutate(batchSize)}
            disabled={runCheck.isPending}
          >
            <SearchIcon className="h-4 w-4" /> {runCheck.isPending ? t('retractionWatch.running') : t('retractionWatch.run')}
          </Button>
        </div>
      </div>

      {runCheck.isError && <p className="text-sm text-red-600">{(runCheck.error as Error).message}</p>}
      {runCheck.isSuccess && (
        <p className="text-sm text-include">
          {t('retractionWatch.doneSummary', { checked: runCheck.data.checked, flagged: runCheck.data.flagged })}
        </p>
      )}
    </Card>
  )
}
