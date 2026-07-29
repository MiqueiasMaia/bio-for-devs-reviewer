import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import type { ProjectOutletContext } from '@/features/projects/ProjectLayout'
import { DedupResolutionWizard } from './DedupResolutionWizard'

export function DedupReviewPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('duplicates.title')}</h2>
        <p className="text-sm text-mut">{t('duplicates.subtitle')}</p>
      </div>
      <DedupResolutionWizard projectId={project.id} />
    </div>
  )
}
