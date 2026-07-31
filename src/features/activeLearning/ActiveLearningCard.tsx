import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ZapIcon } from '@/components/ui/icons'
import { MIN_EXAMPLES_PER_CLASS, MIN_TRAINING_EXAMPLES } from '@/domain/activeLearning/reranker'
import { useRunRerank, useScoringStatus } from './hooks'

export function ActiveLearningCard({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const { data: status } = useScoringStatus(projectId)
  const rerank = useRunRerank(projectId)
  const outcome = rerank.data

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-fg">{t('activeLearning.title')}</h3>
        <p className="text-xs text-mut">{t('activeLearning.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-mut">{t('activeLearning.lastTrainedLabel')}</p>
          <p className="font-mono text-sm font-semibold text-fg">
            {status?.lastScoredAt
              ? new Date(status.lastScoredAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
              : t('activeLearning.never')}
          </p>
        </div>
        <div>
          <p className="text-xs text-mut">{t('activeLearning.scoredLabel')}</p>
          <p className="font-mono text-lg font-semibold text-fg">
            {status ? `${status.scoredCount}/${status.totalEligible}` : '—'}
          </p>
        </div>
      </div>

      <div>
        <Button
          className="inline-flex items-center gap-1.5"
          onClick={() => rerank.mutate()}
          disabled={rerank.isPending}
        >
          <ZapIcon className="h-4 w-4" /> {rerank.isPending ? t('activeLearning.running') : t('activeLearning.run')}
        </Button>
      </div>

      {rerank.isError && <p className="text-sm text-red-600">{(rerank.error as Error).message}</p>}
      {outcome?.status === 'insufficient_data' && (
        <p className="text-xs text-uncertain">
          {t('activeLearning.insufficientData', {
            decided: outcome.decidedCount,
            minTotal: MIN_TRAINING_EXAMPLES,
            positive: outcome.positiveCount,
            negative: outcome.negativeCount,
            minPerClass: MIN_EXAMPLES_PER_CLASS,
          })}
        </p>
      )}
      {outcome?.status === 'trained' && (
        <p className="text-sm text-include">
          {t('activeLearning.doneSummary', {
            trainingSize: outcome.result.trainingSize,
            scored: outcome.result.scores.size,
          })}
        </p>
      )}
    </Card>
  )
}
