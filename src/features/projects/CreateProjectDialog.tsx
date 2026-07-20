import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { useCreateProject } from './hooks'
import type { ScreeningStage } from '@/types/domain'

export function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createProject = useCreateProject()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prosperoId, setProsperoId] = useState('')
  const [reviewersRequired, setReviewersRequired] = useState(2)
  const [stages, setStages] = useState<Record<ScreeningStage, boolean>>({
    title_abstract: true,
    full_text: true,
  })

  function toggleStage(stage: ScreeningStage) {
    setStages((prev) => ({ ...prev, [stage]: !prev[stage] }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const stagesEnabled = (Object.keys(stages) as ScreeningStage[]).filter((s) => stages[s])
    const project = await createProject.mutateAsync({
      name,
      description,
      prosperoId: prosperoId || undefined,
      reviewersRequiredPerRecord: reviewersRequired,
      stagesEnabled: stagesEnabled.length > 0 ? stagesEnabled : ['title_abstract'],
    })
    onClose()
    navigate(`/projects/${project.id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title={t('projectWizard.title')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label={t('projectWizard.name')}
          placeholder={t('projectWizard.namePlaceholder')}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-fg">
            {t('projectWizard.description')}{' '}
            <span className="font-normal text-mut">({t('common.optional')})</span>
          </label>
          <textarea
            id="description"
            className="min-h-20 rounded-md border border-line px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-include"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <TextField
          label={`${t('projectWizard.prosperoId')} (${t('common.optional')})`}
          value={prosperoId}
          onChange={(e) => setProsperoId(e.target.value)}
        />
        <TextField
          label={t('projectWizard.reviewersRequired')}
          type="number"
          min={1}
          max={10}
          required
          value={reviewersRequired}
          onChange={(e) => setReviewersRequired(Number(e.target.value))}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-fg">{t('projectWizard.stagesEnabled')}</legend>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={stages.title_abstract}
              onChange={() => toggleStage('title_abstract')}
            />
            {t('projectWizard.stageTitleAbstract')}
          </label>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input type="checkbox" checked={stages.full_text} onChange={() => toggleStage('full_text')} />
            {t('projectWizard.stageFullText')}
          </label>
        </fieldset>
        {createProject.isError && <p className="text-sm text-red-600">{t('projectWizard.createError')}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={createProject.isPending || !name}>
            {t('common.create')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
