import type { ReactNode } from 'react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { useUnlockStage } from '@/features/projects/hooks'
import type { ProjectDetail } from '@/features/projects/api'
import { getApplicableStages, getPreviousStage, isStageUnlocked } from '@/domain/stageLock/stageLock'
import { stageLabelKey } from '@/lib/stageLabel'
import type { StageKey } from '@/types/domain'
import { LockIcon } from './ui/icons'
import { Button } from './ui/Button'

/**
 * Gates a stage's page behind sequential completion: renders `children`
 * once the stage is unlocked, otherwise fully replaces them with a locked
 * notice (rather than a banner alongside real data — showing conflicts/RoB/
 * extraction content before the previous stage is officially closed would
 * leak stage-N data early). The owner sees an "unlock now" shortcut; anyone
 * else sees a waiting message — actual enforcement is still the `projects`
 * RLS owner-only update policy, this is just the UI-level guard.
 */
export function StageGate({ project, stage, children }: { project: ProjectDetail; stage: StageKey; children: ReactNode }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { unlock, isPending } = useUnlockStage(project.id)

  const applicable = getApplicableStages(project.settings)
  if (isStageUnlocked(stage, project.settings.unlocked_stages, applicable)) return <>{children}</>

  const isOwner = project.ownerId === user?.id
  const previous = getPreviousStage(stage, applicable)

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 border border-line bg-white py-16 text-center">
      <LockIcon className="h-6 w-6 text-mut" />
      <p className="text-sm font-semibold text-fg">{t('stageLock.pageLockedTitle')}</p>
      <p className="text-sm text-mut">
        {previous ? t('stageLock.pageLockedBody', { stage: t(stageLabelKey(previous)) }) : t('stageLock.pageLockedBodyGeneric')}
      </p>
      {isOwner ? (
        <Button onClick={() => unlock(project, stage)} disabled={isPending}>
          {t('stageLock.unlockCta')}
        </Button>
      ) : (
        <p className="text-xs text-mut">{t('stageLock.waitingForOwner')}</p>
      )}
    </div>
  )
}
