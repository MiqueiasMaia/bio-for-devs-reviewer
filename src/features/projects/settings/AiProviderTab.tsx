import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import type { ProjectOutletContext } from '../ProjectLayout'
import { CURATED_MODELS, PROVIDER_LABELS, PROVIDER_ORDER } from '@/domain/aiProvider/models'
import { PROVIDER_SETUP_INSTRUCTIONS } from '@/domain/aiProvider/setupInstructions'
import type { AIProvider } from '@/types/domain'
import { useAiProviderConfig, useAiUsageSummary, useDeleteAiProviderConfig, useSaveAiProviderConfig } from '@/features/aiProvider/hooks'

export function AiProviderTab() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { data: config, isLoading } = useAiProviderConfig(project.id)
  const { data: usage } = useAiUsageSummary(project.id)
  const save = useSaveAiProviderConfig(project.id)
  const remove = useDeleteAiProviderConfig(project.id)

  const [provider, setProvider] = useState<AIProvider>(config?.provider ?? 'google')
  const [model, setModel] = useState(config?.model ?? CURATED_MODELS.google[0].value)
  const [apiKey, setApiKey] = useState('')
  const [replacingKey, setReplacingKey] = useState(false)

  if (project.ownerId !== user?.id) {
    return (
      <Card className="py-10 text-center text-sm text-mut">{t('aiProvider.ownerOnly')}</Card>
    )
  }

  function handleProviderChange(next: AIProvider) {
    setProvider(next)
    setModel(CURATED_MODELS[next][0].value)
  }

  function handleSave() {
    save.mutate(
      { provider, model, apiKey: apiKey || undefined },
      {
        onSuccess: () => {
          setApiKey('')
          setReplacingKey(false)
        },
      },
    )
  }

  const hasConfig = Boolean(config)
  const needsKeyNow = !hasConfig || replacingKey

  const totalCost = usage?.reduce((sum, u) => sum + u.totalCost, 0) ?? 0
  const anyMissingPricing = usage?.some((u) => u.hasMissingPricing) ?? false

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('aiProvider.title')}</h2>
        <p className="text-sm text-mut">{t('aiProvider.subtitle')}</p>
      </div>

      <Card className="flex flex-col gap-4">
        {!isLoading && config && (
          <p className="text-sm text-fg">
            {t('aiProvider.currentConfig', {
              provider: PROVIDER_LABELS[config.provider],
              model: config.model,
              date: new Date(config.updatedAt).toLocaleDateString(),
            })}
          </p>
        )}

        <Select
          label={t('aiProvider.provider')}
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
        >
          {PROVIDER_ORDER.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_LABELS[p]}
            </option>
          ))}
        </Select>

        <Select label={t('aiProvider.model')} value={model} onChange={(e) => setModel(e.target.value)}>
          {CURATED_MODELS[provider].map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-2 border border-line bg-bg p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-mut">
            {t('aiProvider.setupTitle', { provider: PROVIDER_LABELS[provider] })}
          </p>
          <ol className="ml-4 list-decimal space-y-1 text-sm text-fg">
            {PROVIDER_SETUP_INSTRUCTIONS[provider].steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <p className="text-xs text-mut">{PROVIDER_SETUP_INSTRUCTIONS[provider].freeTierNote}</p>
          <a
            href={PROVIDER_SETUP_INSTRUCTIONS[provider].keyUrl}
            target="_blank"
            rel="noreferrer"
            className="self-start text-sm text-include underline"
          >
            {t('aiProvider.openKeyPage', { url: PROVIDER_SETUP_INSTRUCTIONS[provider].keyUrlLabel })} ↗
          </a>
        </div>

        {needsKeyNow ? (
          <TextField
            label={t('aiProvider.apiKey')}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        ) : (
          <div className="flex items-center gap-3 text-sm text-mut">
            <span>{t('aiProvider.keyConfigured')}</span>
            <button type="button" className="cursor-pointer text-include underline" onClick={() => setReplacingKey(true)}>
              {t('aiProvider.replaceKey')}
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={save.isPending || (needsKeyNow && !apiKey)}
          >
            {save.isPending ? t('common.saving') : t('common.save')}
          </Button>
          {save.isSuccess && <span className="text-sm text-include">{t('common.saved')}</span>}
          {save.isError && <span className="text-sm text-red-600">{save.error.message}</span>}
          {hasConfig && (
            <Button
              variant="danger"
              className="ml-auto"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              {t('aiProvider.removeConfig')}
            </Button>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-fg">{t('aiProvider.usageTitle')}</h3>
        {(!usage || usage.length === 0) && <p className="text-sm text-mut">{t('aiProvider.noUsage')}</p>}
        {usage && usage.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {usage.map((u) => (
                <div
                  key={`${u.provider}:${u.model}`}
                  className="flex items-center justify-between border-b border-line py-1.5 text-sm last:border-b-0"
                >
                  <span className="text-fg">
                    {PROVIDER_LABELS[u.provider]} · {u.model}
                  </span>
                  <span className="font-mono text-xs text-mut">
                    {u.callCount} {t('aiProvider.calls')} · {u.totalInputTokens + u.totalOutputTokens} tokens ·{' '}
                    {u.hasMissingPricing ? '≥' : ''}${u.totalCost.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm font-semibold text-fg">
              {t('aiProvider.totalCost', { amount: totalCost.toFixed(4) })}
              {anyMissingPricing && <span className="ml-2 text-xs font-normal text-uncertain">{t('aiProvider.missingPricingNote')}</span>}
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
