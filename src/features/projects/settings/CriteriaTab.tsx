import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import type { ProjectOutletContext } from '../ProjectLayout'
import { useCriteria, useCriteriaMutations } from './hooks'
import type { CriterionKind, PicotsDimension } from '@/types/domain'
import type { CriterionRow } from './api'

const PICOTS_OPTIONS: PicotsDimension[] = ['P', 'I', 'C', 'O', 'T', 'S']

function CriterionEditor({
  criterion,
  onUpdate,
  onDelete,
}: {
  criterion: CriterionRow
  onUpdate: (patch: { text?: string; picotsDimension?: PicotsDimension | null }) => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-2 border-b border-line py-3 last:border-b-0">
      <textarea
        className="min-h-10 flex-1 border border-line px-3 py-2 text-sm"
        defaultValue={criterion.text}
        onBlur={(e) => {
          if (e.target.value !== criterion.text) onUpdate({ text: e.target.value })
        }}
      />
      <Select
        label=""
        aria-label={t('criteria.picotsDimension')}
        className="w-24"
        value={criterion.picotsDimension ?? ''}
        onChange={(e) =>
          onUpdate({ picotsDimension: (e.target.value || null) as PicotsDimension | null })
        }
      >
        <option value="">{t('criteria.none')}</option>
        {PICOTS_OPTIONS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
      <Button variant="ghost" onClick={onDelete} aria-label={t('common.delete')}>
        ✕
      </Button>
    </div>
  )
}

function CriteriaSection({ kind }: { kind: CriterionKind }) {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const { data: criteria } = useCriteria(project.id)
  const mutations = useCriteriaMutations(project.id)

  const rows = (criteria ?? []).filter((c) => c.kind === kind)

  function handleAdd() {
    const nextOrder = rows.length > 0 ? Math.max(...rows.map((r) => r.orderIndex)) + 1 : 1
    mutations.create.mutate({ kind, text: '', orderIndex: nextOrder, picotsDimension: null })
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">
          {kind === 'inclusion' ? t('criteria.inclusion') : t('criteria.exclusion')}
        </h3>
        <Button variant="secondary" onClick={handleAdd}>
          {kind === 'inclusion' ? t('criteria.addInclusion') : t('criteria.addExclusion')}
        </Button>
      </div>
      {rows.length === 0 && <p className="text-sm text-mut">{t('criteria.empty')}</p>}
      {rows.map((c) => (
        <CriterionEditor
          key={c.id}
          criterion={c}
          onUpdate={(patch) => mutations.update.mutate({ id: c.id, patch })}
          onDelete={() => mutations.remove.mutate(c.id)}
        />
      ))}
    </Card>
  )
}

export function CriteriaTab() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('criteria.title')}</h2>
        <p className="text-sm text-mut">{t('criteria.subtitle')}</p>
      </div>
      <CriteriaSection kind="inclusion" />
      <CriteriaSection kind="exclusion" />
    </div>
  )
}
