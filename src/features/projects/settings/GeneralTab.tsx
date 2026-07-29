import { useState, type FormEvent } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import type { ProjectOutletContext } from '../ProjectLayout'
import { useArchiveProject, useDeleteProject, useUnarchiveProject, useUpdateProjectSettings } from '../hooks'
import { BackupPanel } from '@/features/backup/BackupPanel'
import type { ScreeningStage } from '@/types/domain'

export function GeneralTab() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const updateSettings = useUpdateProjectSettings(project.id)
  const archiveProject = useArchiveProject()
  const unarchiveProject = useUnarchiveProject()
  const deleteProject = useDeleteProject()
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

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
            onChange={(e) =>
              setSettings({
                ...settings,
                ai_screening_enabled: e.target.checked,
                ai_counts_as_reviewer: e.target.checked ? settings.ai_counts_as_reviewer : false,
              })
            }
          />
          {t('settingsGeneral.aiScreeningEnabled')}
        </label>
        {settings.ai_screening_enabled && (
          <label className="ml-6 flex flex-col gap-1 text-sm text-fg">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.ai_counts_as_reviewer}
                onChange={(e) => setSettings({ ...settings, ai_counts_as_reviewer: e.target.checked })}
              />
              {t('settingsGeneral.aiCountsAsReviewer')}
            </span>
            <span className="text-xs text-mut">{t('settingsGeneral.aiCountsAsReviewerHint')}</span>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={settings.risk_of_bias_enabled}
            onChange={(e) => setSettings({ ...settings, risk_of_bias_enabled: e.target.checked })}
          />
          {t('settingsGeneral.riskOfBiasEnabled')}
        </label>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={settings.data_extraction_enabled}
            onChange={(e) => setSettings({ ...settings, data_extraction_enabled: e.target.checked })}
          />
          {t('settingsGeneral.dataExtractionEnabled')}
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

    <Card className="flex flex-col gap-4 border-red-300">
      <div>
        <h2 className="text-base font-semibold text-red-700">{t('dangerZone.title')}</h2>
        <p className="text-sm text-mut">{t('dangerZone.subtitle')}</p>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
        <div>
          <p className="text-sm font-medium text-fg">
            {project.archivedAt ? t('dangerZone.archivedLabel') : t('dangerZone.archiveLabel')}
          </p>
          <p className="text-xs text-mut">{t('dangerZone.archiveHint')}</p>
        </div>
        {project.archivedAt ? (
          <Button
            variant="secondary"
            disabled={unarchiveProject.isPending}
            onClick={() => unarchiveProject.mutate(project.id)}
          >
            {t('dangerZone.unarchive')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={archiveProject.isPending}
            onClick={() => archiveProject.mutate(project.id)}
          >
            {t('dangerZone.archive')}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <p className="text-sm font-medium text-fg">{t('dangerZone.deleteLabel')}</p>
        <p className="text-xs text-mut">{t('dangerZone.deleteHint')}</p>
        <TextField
          label={t('dangerZone.confirmNameLabel', { name: project.name })}
          value={deleteConfirmName}
          onChange={(e) => setDeleteConfirmName(e.target.value)}
        />
        <Button
          variant="danger"
          className="self-start"
          disabled={deleteConfirmName !== project.name || deleteProject.isPending}
          onClick={() => deleteProject.mutate(project.id, { onSuccess: () => navigate('/projects') })}
        >
          {deleteProject.isPending ? t('dangerZone.deleting') : t('dangerZone.delete')}
        </Button>
      </div>
    </Card>
    </div>
  )
}
