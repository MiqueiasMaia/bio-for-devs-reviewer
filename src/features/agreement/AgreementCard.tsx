import { useState } from 'react'
import { useTranslation, type TranslationKey } from '@/i18n'
import { Card } from '@/components/ui/Card'
import type { ScreeningStage } from '@/types/domain'
import { useAgreement } from './hooks'
import { interpretKappa } from './api'

export function AgreementCard({ projectId, stage }: { projectId: string; stage: ScreeningStage }) {
  const { t } = useTranslation()
  const [includeAi, setIncludeAi] = useState(false)
  const { data, isLoading } = useAgreement(projectId, stage, includeAi)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">{t('agreement.title')}</h3>
        <label className="flex items-center gap-1.5 text-xs text-mut">
          <input type="checkbox" checked={includeAi} onChange={(e) => setIncludeAi(e.target.checked)} />
          {t('agreement.includeAi')}
        </label>
      </div>

      {isLoading && <p className="text-sm text-mut">{t('common.loading')}</p>}

      {data && data.method === 'insufficient_data' && (
        <p className="text-sm text-mut">{t('agreement.notEnoughData')}</p>
      )}

      {data && data.method !== 'insufficient_data' && (
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-mut">
              {data.method === 'cohen' ? t('agreement.kappaCohen') : t('agreement.kappaFleiss')}
            </p>
            <p className="text-lg font-semibold text-fg">
              {Number.isNaN(data.kappa) ? '—' : data.kappa.toFixed(3)}
            </p>
            {!Number.isNaN(data.kappa) && (
              <p className="text-xs text-mut">{t(interpretKappa(data.kappa) as TranslationKey)}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-mut">{t('agreement.observedAgreement')}</p>
            <p className="text-lg font-semibold text-fg">
              {Number.isNaN(data.observedAgreement) ? '—' : `${(data.observedAgreement * 100).toFixed(0)}%`}
            </p>
          </div>
          <div>
            <p className="text-xs text-mut">{t('agreement.percentAgreement')}</p>
            <p className="text-lg font-semibold text-fg">
              {Number.isNaN(data.percentAgreement) ? '—' : `${(data.percentAgreement * 100).toFixed(0)}%`}
            </p>
          </div>
          <div>
            <p className="text-xs text-mut">{data.raterCount} raters · {data.itemCount} itens</p>
          </div>
        </div>
      )}
    </Card>
  )
}
