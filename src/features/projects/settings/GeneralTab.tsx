import { useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import type { ProjectOutletContext } from '../ProjectLayout'
import { useUpdateProjectSettings } from '../hooks'
import { BackupPanel } from '@/features/backup/BackupPanel'
import type { ScreeningStage } from '@/types/domain'

export function GeneralTab() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const updateSettings = useUpdateProjectSettings(project.id)

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [prosperoId, setProsperoId] = useState(project.prosperoId ?? '')
  const [settings, setSettings] = useState(project.settings)

  function toggleStage(stage: ScreeningStage) {
    setSettings((prev) => {
      const has = prev.stages_enabled.includes(stage)
      return {
        ...prev,
        stages_enabled: has
          ? prev.stages_enabled.filter((s) => s !== stage)
          : [...prev.stages_enabled, stage],
      }
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    updateSettings.mutate({ name, description, prosperoId: prosperoId || null, settings })
  }

  return (
    <div className="flex flex-col gap-6">
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-fg">{t('settingsGeneral.title')}</h2>
        <TextField label={t('settingsGeneral.name')} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-fg">
            {t('settingsGeneral.description')}
          </label>
          <textarea
            id="description"
            className="min-h-20 border border-line px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <TextField
          label={t('settingsGeneral.prosperoId')}
          value={prosperoId}
          onChange={(e) => setProsperoId(e.target.value)}
        />
        <TextField
          label={t('settingsGeneral.reviewersRequired')}
          type="number"
          min={1}
          max={10}
          value={settings.reviewers_required_per_record}
          onChange={(e) =>
            setSettings({ ...settings, reviewers_required_per_record: Number(e.target.value) })
          }
        />
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={settings.blind_screening}
            onChange={(e) => setSettings({ ...settings, blind_screening: e.target.checked })}
          />
          {t('settingsGeneral.blindScreening')}
        </label>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={settings.auto_advance_on_decision}
            onChange={(e) => setSettings({ ...settings, auto_advance_on_decision: e.target.checked })}
          />
          {t('settingsGeneral.autoAdvance')}
        </label>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={settings.ai_screening_enabled}
            onChange={(e) => setSettings({ ...settings, ai_screening_enabled: e.target.checked })}
          />
          {t('settingsGeneral.aiScreeningEnabled')}
        </label>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={settings.risk_of_bias_enabled}
            onChange={(e) => setSettings({ ...settings, risk_of_bias_enabled: e.target.checked })}
          />
          {t('settingsGeneral.riskOfBiasEnabled')}
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-fg">{t('settingsGeneral.stagesEnabled')}</legend>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={settings.stages_enabled.includes('title_abstract')}
              onChange={() => toggleStage('title_abstract')}
            />
            {t('settingsGeneral.stageTitleAbstract')}
          </label>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={settings.stages_enabled.includes('full_text')}
              onChange={() => toggleStage('full_text')}
            />
            {t('settingsGeneral.stageFullText')}
          </label>
        </fieldset>

        <div className="border-t border-line pt-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">{t('settingsGeneral.dedupTitle')}</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={settings.dedup.on_doi}
                onChange={(e) =>
                  setSettings({ ...settings, dedup: { ...settings.dedup, on_doi: e.target.checked } })
                }
              />
              {t('settingsGeneral.dedupOnDoi')}
            </label>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={settings.dedup.on_normalized_title}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dedup: { ...settings.dedup, on_normalized_title: e.target.checked },
                  })
                }
              />
              {t('settingsGeneral.dedupOnTitle')}
            </label>
            <TextField
              label={t('settingsGeneral.dedupThreshold')}
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={settings.dedup.title_similarity_threshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dedup: { ...settings.dedup, title_similarity_threshold: Number(e.target.value) },
                })
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? t('common.saving') : t('common.save')}
          </Button>
          {updateSettings.isSuccess && <span className="text-sm text-include">{t('common.saved')}</span>}
        </div>
      </form>
    </Card>
    <BackupPanel projectId={project.id} settings={settings} />
    </div>
  )
}
