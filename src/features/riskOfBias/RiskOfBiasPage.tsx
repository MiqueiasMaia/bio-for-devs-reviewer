import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation, type TranslationKey } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import type { ProjectOutletContext } from '@/features/projects/ProjectLayout'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { Select } from '@/components/ui/Select'
import { SaveIcon } from '@/components/ui/icons'
import { StageGate } from '@/components/StageGate'
import { PROBAST_DOMAINS, ROB_ANSWER_OPTIONS, ROB_JUDGMENT_OPTIONS, type ProbastDomainConfig } from '@/domain/riskOfBias/probast'
import type { RobAnswer, RobJudgment } from '@/types/domain'
import { useRobAssessments, useRobEligibleRecords, useRobOverallStatus, useSaveRobAssessment } from './hooks'
import type { RobAssessmentRow } from './api'

function JudgmentSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: RobJudgment | ''
  onChange: (value: RobJudgment | '') => void
}) {
  const { t } = useTranslation()
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value as RobJudgment | '')}>
      <option value="">{t('riskOfBias.selectJudgment')}</option>
      {ROB_JUDGMENT_OPTIONS.map((j) => (
        <option key={j} value={j}>
          {t(`riskOfBias.judgment_${j}` as TranslationKey)}
        </option>
      ))}
    </Select>
  )
}

function DomainBlock({
  projectId,
  recordId,
  assessorId,
  config,
  initial,
}: {
  projectId: string
  recordId: string
  assessorId: string
  config: ProbastDomainConfig
  initial?: RobAssessmentRow
}) {
  const { t } = useTranslation()
  const save = useSaveRobAssessment(projectId, recordId, assessorId)
  const [answers, setAnswers] = useState<Record<string, RobAnswer | ''>>(() =>
    Object.fromEntries(config.signallingQuestions.map((q) => [q.id, initial?.answers[q.id] ?? ''])),
  )
  const [riskJudgment, setRiskJudgment] = useState<RobJudgment | ''>(initial?.riskJudgment ?? '')
  const [applicabilityJudgment, setApplicabilityJudgment] = useState<RobJudgment | ''>(
    initial?.applicabilityJudgment ?? '',
  )
  const [justification, setJustification] = useState(initial?.justification ?? '')

  function handleSave() {
    save.mutate({
      domain: config.id,
      answers: Object.fromEntries(Object.entries(answers).filter(([, v]) => v !== '')) as Record<string, RobAnswer>,
      riskJudgment: riskJudgment || null,
      applicabilityJudgment: config.hasApplicability ? applicabilityJudgment || null : null,
      justification,
    })
  }

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-fg">{t(config.labelKey as TranslationKey)}</h3>
      {config.signallingQuestions.map((q) => (
        <Select
          key={q.id}
          label={t(q.questionKey as TranslationKey)}
          value={answers[q.id]}
          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value as RobAnswer | '' }))}
        >
          <option value="">{t('riskOfBias.selectAnswer')}</option>
          {ROB_ANSWER_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {t(`riskOfBias.answer_${a}` as TranslationKey)}
            </option>
          ))}
        </Select>
      ))}
      <JudgmentSelect label={t('riskOfBias.riskJudgment')} value={riskJudgment} onChange={setRiskJudgment} />
      {config.hasApplicability && (
        <JudgmentSelect
          label={t('riskOfBias.applicabilityJudgment')}
          value={applicabilityJudgment}
          onChange={setApplicabilityJudgment}
        />
      )}
      <textarea
        value={justification}
        onChange={(e) => setJustification(e.target.value)}
        placeholder={t('riskOfBias.justificationPlaceholder')}
        className="min-h-16 w-full border border-line px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <IconButton
          icon={<SaveIcon />}
          label={save.isPending ? t('common.saving') : t('common.save')}
          variant="primary"
          onClick={handleSave}
          disabled={save.isPending}
        />
        {save.isSuccess && <span className="text-sm text-include">{t('common.saved')}</span>}
      </div>
    </Card>
  )
}

function OverallBlock({
  projectId,
  recordId,
  assessorId,
  initial,
}: {
  projectId: string
  recordId: string
  assessorId: string
  initial?: RobAssessmentRow
}) {
  const { t } = useTranslation()
  const save = useSaveRobAssessment(projectId, recordId, assessorId)
  const [riskJudgment, setRiskJudgment] = useState<RobJudgment | ''>(initial?.riskJudgment ?? '')
  const [applicabilityJudgment, setApplicabilityJudgment] = useState<RobJudgment | ''>(
    initial?.applicabilityJudgment ?? '',
  )
  const [justification, setJustification] = useState(initial?.justification ?? '')

  function handleSave() {
    save.mutate({
      domain: 'overall',
      answers: {},
      riskJudgment: riskJudgment || null,
      applicabilityJudgment: applicabilityJudgment || null,
      justification,
    })
  }

  return (
    <Card className="flex flex-col gap-3 border-2 border-include/30">
      <h3 className="text-sm font-semibold text-fg">{t('riskOfBias.overallTitle')}</h3>
      <JudgmentSelect label={t('riskOfBias.overallRisk')} value={riskJudgment} onChange={setRiskJudgment} />
      <JudgmentSelect
        label={t('riskOfBias.overallApplicability')}
        value={applicabilityJudgment}
        onChange={setApplicabilityJudgment}
      />
      <textarea
        value={justification}
        onChange={(e) => setJustification(e.target.value)}
        placeholder={t('riskOfBias.justificationPlaceholder')}
        className="min-h-16 w-full border border-line px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <IconButton
          icon={<SaveIcon />}
          label={save.isPending ? t('common.saving') : t('common.save')}
          variant="primary"
          onClick={handleSave}
          disabled={save.isPending}
        />
        {save.isSuccess && <span className="text-sm text-include">{t('common.saved')}</span>}
      </div>
    </Card>
  )
}

export function RiskOfBiasPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const assessorId = user!.id

  const { data: records, isLoading } = useRobEligibleRecords(project.id)
  const { data: overallStatus } = useRobOverallStatus(project.id, assessorId)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId && records && records.length > 0) setSelectedId(records[0].id)
  }, [records, selectedId])

  const { data: assessments } = useRobAssessments(selectedId ?? '', assessorId)
  const current = useMemo(() => records?.find((r) => r.id === selectedId), [records, selectedId])

  return (
    <StageGate project={project} stage="risk_of_bias">
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-fg">{t('riskOfBias.title')}</h2>
          <p className="text-sm text-mut">{t('riskOfBias.subtitle')}</p>
        </div>

        {isLoading && <p className="text-sm text-mut">{t('common.loading')}</p>}
        {!isLoading && records?.length === 0 && (
          <Card className="py-10 text-center text-sm text-mut">{t('riskOfBias.empty')}</Card>
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
                    selectedId === r.id ? 'border-include bg-include/5' : 'border-line hover:bg-bg',
                  )}
                >
                  <span className="block truncate font-medium text-fg">{r.title || t('common.untitled')}</span>
                  <span className="text-xs text-mut">
                    {r.humanRef} ·{' '}
                    {overallStatus?.get(r.id) ? t('riskOfBias.statusDone') : t('riskOfBias.statusPending')}
                  </span>
                </button>
              ))}
            </div>

            {current && (
              <div className="flex flex-col gap-4">
                <Card>
                  <p className="text-lg font-semibold text-fg">{current.title || t('common.untitled')}</p>
                  <p className="text-sm text-mut">
                    {current.authors} · {current.year ?? '—'}
                  </p>
                </Card>

                {PROBAST_DOMAINS.map((config) => (
                  <DomainBlock
                    key={`${config.id}-${selectedId}`}
                    projectId={project.id}
                    recordId={selectedId!}
                    assessorId={assessorId}
                    config={config}
                    initial={assessments?.get(config.id)}
                  />
                ))}

                <OverallBlock
                  key={`overall-${selectedId}`}
                  projectId={project.id}
                  recordId={selectedId!}
                  assessorId={assessorId}
                  initial={assessments?.get('overall')}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </StageGate>
  )
}
