import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation, type TranslationKey } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { PlusIcon, TrashIcon } from '@/components/ui/icons'
import type { ProjectOutletContext } from '../ProjectLayout'
import { useExtractionFields, useExtractionFieldMutations } from './hooks'
import type { ExtractionFieldRow } from './api'
import type { ExtractionFieldType } from '@/types/domain'

const FIELD_TYPES: ExtractionFieldType[] = ['text', 'number', 'single_choice', 'multi_choice']
const CHOICE_TYPES: ExtractionFieldType[] = ['single_choice', 'multi_choice']

function ExtractionFieldEditor({
  field,
  onUpdate,
  onDelete,
}: {
  field: ExtractionFieldRow
  onUpdate: (patch: { label?: string; fieldType?: ExtractionFieldType; options?: string[]; required?: boolean }) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 border-b border-line py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="border border-line px-2 py-0.5 font-mono text-xs text-mut">{field.key}</span>
        <TextField
          label=""
          aria-label={t('extractionFields.label')}
          className="max-w-56"
          defaultValue={field.label}
          onBlur={(e) => {
            if (e.target.value !== field.label) onUpdate({ label: e.target.value })
          }}
        />
        <Select
          label=""
          aria-label={t('extractionFields.fieldType')}
          className="max-w-40"
          value={field.fieldType}
          onChange={(e) => onUpdate({ fieldType: e.target.value as ExtractionFieldType })}
        >
          {FIELD_TYPES.map((ft) => (
            <option key={ft} value={ft}>
              {t(`extractionFields.type_${ft}` as TranslationKey)}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-1.5 text-sm text-fg">
          <input type="checkbox" checked={field.required} onChange={(e) => onUpdate({ required: e.target.checked })} />
          {t('extractionFields.required')}
        </label>
        <IconButton icon={<TrashIcon />} label={t('common.delete')} variant="ghost" onClick={onDelete} className="ml-auto" />
      </div>
      {CHOICE_TYPES.includes(field.fieldType) && (
        <TextField
          label={t('extractionFields.options')}
          defaultValue={field.options.join(', ')}
          onBlur={(e) => {
            const options = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            onUpdate({ options })
          }}
        />
      )}
    </div>
  )
}

export function ExtractionFieldsTab() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const { data: fields } = useExtractionFields(project.id)
  const mutations = useExtractionFieldMutations(project.id)
  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')

  function handleAdd() {
    const key = newKey.trim()
    const label = newLabel.trim()
    if (!key || !label) return
    const nextOrder = fields && fields.length > 0 ? Math.max(...fields.map((f) => f.orderIndex)) + 1 : 1
    mutations.create.mutate({
      key,
      label,
      fieldType: 'text',
      options: [],
      required: false,
      orderIndex: nextOrder,
    })
    setNewKey('')
    setNewLabel('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('extractionFields.title')}</h2>
        <p className="text-sm text-mut">{t('extractionFields.subtitle')}</p>
      </div>
      <Card>
        {(!fields || fields.length === 0) && <p className="text-sm text-mut">{t('extractionFields.empty')}</p>}
        {fields?.map((field) => (
          <ExtractionFieldEditor
            key={field.id}
            field={field}
            onUpdate={(patch) => mutations.update.mutate({ id: field.id, patch })}
            onDelete={() => mutations.remove.mutate(field.id)}
          />
        ))}
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <TextField
            label={t('extractionFields.keyPlaceholder')}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value.replace(/[^a-z0-9_]/gi, '_'))}
          />
          <TextField
            label={t('extractionFields.labelPlaceholder')}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <IconButton
            icon={<PlusIcon />}
            label={t('extractionFields.add')}
            variant="primary"
            onClick={handleAdd}
            disabled={!newKey.trim() || !newLabel.trim()}
          />
        </div>
      </Card>
    </div>
  )
}
