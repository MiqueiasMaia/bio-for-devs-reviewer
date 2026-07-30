import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { TextField } from '@/components/ui/TextField'
import { PlusIcon, TrashIcon } from '@/components/ui/icons'
import type { ProjectOutletContext } from '../ProjectLayout'
import { useHighlightTerms, useHighlightTermMutations } from './hooks'
import type { HighlightTermRow } from './api'

function HighlightTermEditor({
  term,
  onUpdate,
  onDelete,
}: {
  term: HighlightTermRow
  onUpdate: (patch: { category?: string; terms?: string[]; color?: string }) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 border-b border-line py-4 last:border-b-0">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-4 w-4 shrink-0 border border-line"
          style={{ backgroundColor: term.color }}
        />
        <input
          type="color"
          value={term.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          aria-label={t('picots.color')}
          className="h-7 w-10 shrink-0 cursor-pointer rounded border border-line"
        />
        <TextField
          label=""
          aria-label={t('picots.category')}
          className="max-w-48"
          defaultValue={term.category}
          onBlur={(e) => {
            if (e.target.value !== term.category) onUpdate({ category: e.target.value })
          }}
        />
        <IconButton icon={<TrashIcon />} label={t('common.delete')} variant="ghost" onClick={onDelete} className="ml-auto" />
      </div>
      <textarea
        aria-label={t('picots.terms')}
        className="min-h-16 border border-line px-3 py-2 text-sm"
        defaultValue={term.terms.join(', ')}
        onBlur={(e) => {
          const terms = e.target.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          onUpdate({ terms })
        }}
      />
    </div>
  )
}

export function PicotsTab() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const { data: terms } = useHighlightTerms(project.id)
  const mutations = useHighlightTermMutations(project.id)
  const [newCategory, setNewCategory] = useState('')

  function handleAdd() {
    if (!newCategory.trim()) return
    const nextOrder = terms && terms.length > 0 ? Math.max(...terms.map((t) => t.orderIndex)) + 1 : 1
    mutations.create.mutate({
      category: newCategory.trim(),
      terms: [],
      color: '#94a3b8',
      orderIndex: nextOrder,
    })
    setNewCategory('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('picots.title')}</h2>
        <p className="text-sm text-mut">{t('picots.subtitle')}</p>
      </div>
      <Card>
        {(!terms || terms.length === 0) && <p className="text-sm text-mut">{t('picots.empty')}</p>}
        {terms?.map((term) => (
          <HighlightTermEditor
            key={term.id}
            term={term}
            onUpdate={(patch) => mutations.update.mutate({ id: term.id, patch })}
            onDelete={() => mutations.remove.mutate(term.id)}
          />
        ))}
        <div className="mt-4 flex items-end gap-2">
          <TextField
            label={t('picots.categoryPlaceholder')}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <IconButton
            icon={<PlusIcon />}
            label={t('picots.addCategory')}
            variant="primary"
            onClick={handleAdd}
            disabled={!newCategory.trim()}
          />
        </div>
      </Card>
    </div>
  )
}
