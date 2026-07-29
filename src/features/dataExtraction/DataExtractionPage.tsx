import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import type { ProjectOutletContext } from '@/features/projects/ProjectLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { StageGate } from '@/components/StageGate'
import { useExtractionFields } from '@/features/projects/settings/hooks'
import type { ExtractionFieldRow } from '@/features/projects/settings/api'
import { downloadCsv } from '@/features/screening/csvRoundTrip'
import { exportExtractionCsv } from './api'
import {
  useExtractionEligibleRecords,
  useExtractionStatus,
  useExtraction,
  useSaveExtraction,
  useExtractionConflicts,
} from './hooks'

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ExtractionFieldRow
  value: string | string[] | undefined
  onChange: (value: string | string[]) => void
}) {
  if (field.fieldType === 'single_choice') {
    return (
      <Select
        label={field.label}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    )
  }

  if (field.fieldType === 'multi_choice') {
    const selected = Array.isArray(value) ? value : []
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg">{field.label}</span>
        <div className="flex flex-wrap gap-3">
          {field.options.map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-sm text-fg">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) =>
                  onChange(e.target.checked ? [...selected, opt] : selected.filter((v) => v !== opt))
                }
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <TextField
      label={field.label}
      type={field.fieldType === 'number' ? 'number' : 'text'}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function ExtractionForm({
  projectId,
  recordId,
  extractorId,
  fields,
}: {
  projectId: string
  recordId: string
  extractorId: string
  fields: ExtractionFieldRow[]
}) {
  const { t } = useTranslation()
  const { data: initial } = useExtraction(recordId, extractorId)
  const save = useSaveExtraction(projectId, recordId, extractorId)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [notes, setNotes] = useState('')

  useEffect(() => {
    setAnswers(initial?.answers ?? {})
    setNotes(initial?.notes ?? '')
  }, [initial])

  const missingRequired = fields.some((f) => {
    if (!f.required) return false
    const v = answers[f.key]
    return v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
  })

  function handleSave() {
    save.mutate({ answers, notes })
  }

  return (
    <Card className="flex flex-col gap-4">
      {fields.map((f) => (
        <FieldInput
          key={f.id}
          field={f}
          value={answers[f.key]}
          onChange={(v) => setAnswers((prev) => ({ ...prev, [f.key]: v }))}
        />
      ))}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t('dataExtraction.notesPlaceholder')}
        className="min-h-16 w-full border border-line px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? t('common.saving') : t('common.save')}
        </Button>
        {save.isSuccess && <span className="text-sm text-include">{t('common.saved')}</span>}
        {missingRequired && <span className="text-xs text-uncertain">{t('dataExtraction.missingRequired')}</span>}
      </div>
    </Card>
  )
}

export function DataExtractionPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const extractorId = user!.id

  const { data: fields } = useExtractionFields(project.id)
  const { data: records, isLoading } = useExtractionEligibleRecords(project.id)
  const { data: status } = useExtractionStatus(project.id, extractorId)
  const { data: conflicts } = useExtractionConflicts(project.id)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId && records && records.length > 0) setSelectedId(records[0].id)
  }, [records, selectedId])

  const current = useMemo(() => records?.find((r) => r.id === selectedId), [records, selectedId])

  async function handleExport() {
    if (!fields) return
    const csv = await exportExtractionCsv(project.id, fields)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`extracao_${project.id.slice(0, 8)}_${stamp}.csv`, csv)
  }

  if (!fields || fields.length === 0) {
    return (
      <StageGate project={project} stage="data_extraction">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-fg">{t('dataExtraction.title')}</h2>
          <Card className="py-10 text-center text-sm text-mut">{t('dataExtraction.noFields')}</Card>
        </div>
      </StageGate>
    )
  }

  return (
    <StageGate project={project} stage="data_extraction">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('dataExtraction.title')}</h2>
            <p className="text-sm text-mut">{t('dataExtraction.subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={handleExport}>
              {t('dataExtraction.exportCsv')}
            </Button>
            <Link to="conflicts" className="text-sm text-include">
              {t('dataExtraction.viewConflicts', { count: conflicts?.length ?? 0 })} →
            </Link>
          </div>
        </div>

        {isLoading && <p className="text-sm text-mut">{t('common.loading')}</p>}
        {!isLoading && records?.length === 0 && (
          <Card className="py-10 text-center text-sm text-mut">{t('dataExtraction.empty')}</Card>
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
                    {r.humanRef} · {status?.get(r.id) ? t('riskOfBias.statusDone') : t('riskOfBias.statusPending')}
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
                <ExtractionForm
                  key={selectedId}
                  projectId={project.id}
                  recordId={selectedId!}
                  extractorId={extractorId}
                  fields={fields}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </StageGate>
  )
}
