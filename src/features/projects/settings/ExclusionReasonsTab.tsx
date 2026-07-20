import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import type { ProjectOutletContext } from '../ProjectLayout'
import { useExclusionReasons, useExclusionReasonMutations } from './hooks'

export function ExclusionReasonsTab() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const { data: reasons } = useExclusionReasons(project.id)
  const mutations = useExclusionReasonMutations(project.id)
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')

  function handleAdd() {
    if (!code.trim() || !label.trim()) return
    const nextOrder = reasons && reasons.length > 0 ? Math.max(...reasons.map((r) => r.orderIndex)) + 1 : 1
    mutations.create.mutate({ code: code.trim(), label: label.trim(), orderIndex: nextOrder })
    setCode('')
    setLabel('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('exclusionReasons.title')}</h2>
        <p className="text-sm text-mut">{t('exclusionReasons.subtitle')}</p>
      </div>
      <Card>
        {(!reasons || reasons.length === 0) && <p className="text-sm text-mut">{t('exclusionReasons.empty')}</p>}
        {reasons?.map((reason) => (
          <div key={reason.id} className="flex items-center gap-2 border-b border-line py-2 last:border-b-0">
            <input
              className="w-40 rounded-md border border-line px-3 py-2 text-sm"
              defaultValue={reason.code}
              aria-label={t('exclusionReasons.code')}
              onBlur={(e) => {
                if (e.target.value !== reason.code) mutations.update.mutate({ id: reason.id, patch: { code: e.target.value } })
              }}
            />
            <input
              className="flex-1 rounded-md border border-line px-3 py-2 text-sm"
              defaultValue={reason.label}
              aria-label={t('exclusionReasons.label')}
              onBlur={(e) => {
                if (e.target.value !== reason.label) mutations.update.mutate({ id: reason.id, patch: { label: e.target.value } })
              }}
            />
            <Button variant="ghost" onClick={() => mutations.remove.mutate(reason.id)} aria-label={t('common.delete')}>
              ✕
            </Button>
          </div>
        ))}
        <div className="mt-4 flex items-end gap-2">
          <TextField label={t('exclusionReasons.code')} value={code} onChange={(e) => setCode(e.target.value)} />
          <TextField label={t('exclusionReasons.label')} value={label} onChange={(e) => setLabel(e.target.value)} />
          <Button onClick={handleAdd} disabled={!code.trim() || !label.trim()}>
            {t('exclusionReasons.add')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
