import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import type { ProjectOutletContext } from './ProjectLayout'

export function ProjectOverviewPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-fg">{t('projectOverview.subtitle')}</h2>
      {project.description && <p className="mb-4 text-sm text-mut">{project.description}</p>}
      <Card>
        <p className="text-sm text-mut">{t('projectOverview.comingSoon')}</p>
      </Card>
    </div>
  )
}
