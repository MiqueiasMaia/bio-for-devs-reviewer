import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import type { ProjectOutletContext } from '@/features/projects/ProjectLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AgreementCard } from '@/features/agreement/AgreementCard'
import { downloadCsv } from '@/features/screening/csvRoundTrip'
import { decisionLabelKey } from '@/lib/decisionLabel'
import type { ScreeningStage } from '@/types/domain'
import { useAiScreenedRecords, useAiScreeningStats, useAiHumanDivergences } from './hooks'
import { buildAiScreeningStatsCsv } from './api'

export function AiAuditPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [stage, setStage] = useState<ScreeningStage>(project.settings.stages_enabled[0] ?? 'title_abstract')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: records, isLoading } = useAiScreenedRecords(project.id, stage)
  const { data: stats } = useAiScreeningStats(project.id, stage)
  const { data: divergences } = useAiHumanDivergences(project.id, stage)

  const current = useMemo(() => records?.find((r) => r.id === selectedId) ?? records?.[0], [records, selectedId])

  // Underlying tables (ai_screenings/records) aren't owner-restricted at
  // the RLS level (same broad membership access as the rest of the
  // screening data) — this gate is the application-layer enforcement of
  // "audit panel access: owner only", the same pattern already used for
  // blind_screening visibility elsewhere in this codebase.
  if (project.ownerId !== user?.id) {
    return <Card className="py-10 text-center text-sm text-mut">{t('aiAudit.ownerOnly')}</Card>
  }

  function handleExportStats() {
    if (!stats) return
    const csv = buildAiScreeningStatsCsv(stats)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`ia_estatisticas_${project.id.slice(0, 8)}_${stamp}.csv`, csv)
  }

  const statByDecision = new Map(stats?.map((s) => [s.decision, s.count]) ?? [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('aiAudit.title')}</h2>
        <p className="text-sm text-mut">{t('aiAudit.subtitle')}</p>
      </div>

      {project.settings.stages_enabled.length > 1 && (
        <div className="flex gap-1">
          {project.settings.stages_enabled.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={clsx('px-3 py-1.5 text-sm font-medium', stage === s ? 'bg-fg text-white' : 'text-mut hover:bg-bg')}
            >
              {s === 'title_abstract' ? t('screening.stageTitleAbstract') : t('screening.stageFullText')}
            </button>
          ))}
        </div>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">{t('aiAudit.statsTitle')}</h3>
          <Button variant="secondary" onClick={handleExportStats} disabled={!stats || stats.length === 0}>
            {t('aiAudit.exportCsv')}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-mut">{t('aiAudit.totalScreened')}</p>
            <p className="font-mono text-xl font-bold text-fg">{records?.length ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-mut">{t('screening.include')}</p>
            <p className="font-mono text-xl font-bold text-include">{statByDecision.get('INCLUDE') ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-mut">{t('screening.uncertain')}</p>
            <p className="font-mono text-xl font-bold text-uncertain">{statByDecision.get('UNCERTAIN') ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-mut">{t('screening.exclude')}</p>
            <p className="font-mono text-xl font-bold text-exclude">{statByDecision.get('EXCLUDE') ?? 0}</p>
          </div>
        </div>
      </Card>

      <AgreementCard projectId={project.id} stage={stage} />

      {divergences && divergences.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-fg">{t('aiAudit.divergencesTitle')}</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {divergences.map((d) => (
              <li key={d.recordId} className="border-b border-line pb-2 last:border-b-0">
                <p className="font-medium text-fg">
                  {d.humanRef} · {d.title}
                </p>
                <p className="text-xs text-mut">
                  {t('aiAudit.aiSaid')}: {t(decisionLabelKey(d.aiDecision))} · {t('aiAudit.humansSaid')}:{' '}
                  {d.humanDecisions.map((h) => `${h.reviewerName} (${t(decisionLabelKey(h.decision))})`).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-fg">{t('aiAudit.perArticleTitle')}</h3>
        {isLoading && <p className="text-sm text-mut">{t('common.loading')}</p>}
        {!isLoading && records?.length === 0 && (
          <Card className="py-10 text-center text-sm text-mut">{t('aiAudit.empty')}</Card>
        )}
        {records && records.length > 0 && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
            <div className="flex flex-col gap-1.5">
              {records.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={clsx(
                    'border px-3 py-2 text-left text-sm cursor-pointer',
                    current?.id === r.id ? 'border-include bg-include/5' : 'border-line hover:bg-bg',
                  )}
                >
                  <span className="block truncate font-medium text-fg">{r.title || t('common.untitled')}</span>
                  <span className="text-xs text-mut">
                    {r.humanRef} · {t(decisionLabelKey(r.decision))}
                  </span>
                </button>
              ))}
            </div>

            {current && (
              <Card className="flex flex-col gap-3">
                <div>
                  <p className="text-lg font-semibold text-fg">{current.title || t('common.untitled')}</p>
                  <p className="text-sm text-mut">
                    {current.authors} · {current.year ?? '—'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-fg">{t(decisionLabelKey(current.decision))}</span>
                  {current.confidence !== null && (
                    <span className="text-mut">
                      {t('aiAudit.confidence')}: {(current.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                  <span className="text-xs text-mut">{current.modelName}</span>
                </div>
                {current.rationale && <p className="text-sm text-fg">{current.rationale}</p>}
                <div className="flex flex-col gap-1.5">
                  {current.criteriaDetail.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={c.met ? 'text-include' : 'text-red-700'}>{c.met ? '✓' : '✗'}</span>
                      <div>
                        <p className="text-fg">{c.criterion}</p>
                        {c.note && <p className="text-xs text-mut">{c.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
