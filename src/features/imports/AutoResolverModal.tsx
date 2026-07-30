import { useState } from 'react'
import { useTranslation } from '@/i18n'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { XIcon } from '@/components/ui/icons'
import type { AutoResolveCriteria } from '@/domain/dedup/autoResolve'
import { useAutoResolveDedup } from './hooks'

const DEFAULT_SIMILARITY = 97

export function AutoResolverModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean
  onClose: () => void
  projectId: string
}) {
  const { t } = useTranslation()
  const autoResolve = useAutoResolveDedup(projectId)
  const [doi, setDoi] = useState(false)
  const [title, setTitle] = useState(false)
  const [year, setYear] = useState(false)
  const [authors, setAuthors] = useState(false)
  const [journal, setJournal] = useState(false)
  const [similarityEnabled, setSimilarityEnabled] = useState(false)
  const [similarity, setSimilarity] = useState(DEFAULT_SIMILARITY)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resolvedCount, setResolvedCount] = useState<number | null>(null)

  const anyCriterionSelected = doi || title || year || authors || journal || similarityEnabled

  function buildCriteria(): AutoResolveCriteria {
    return { doi, title, year, authors, journal, titleSimilarityThreshold: similarityEnabled ? similarity / 100 : null }
  }

  function handleResolve() {
    autoResolve.mutate(buildCriteria(), {
      onSuccess: (data) => {
        setResolvedCount(data.resolvedCount)
        setConfirmOpen(false)
      },
    })
  }

  function handleClose() {
    setResolvedCount(null)
    setConfirmOpen(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('dedupWizard.autoResolverTitle')} size="wide">
      {resolvedCount !== null ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-include">{t('dedupWizard.resolvedCount', { count: resolvedCount })}</p>
          <div className="flex justify-end">
            <IconButton icon={<XIcon />} label={t('common.close')} onClick={handleClose} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-mut">{t('dedupWizard.autoResolverHint')}</p>

          <div>
            <p className="mb-2 text-sm font-medium text-fg">{t('dedupWizard.criteriaLabel')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <CriterionCheckbox label={t('dedupWizard.criterionDoi')} checked={doi} onChange={setDoi} />
              <CriterionCheckbox label={t('dedupWizard.criterionTitle')} checked={title} onChange={setTitle} />
              <CriterionCheckbox label={t('dedupWizard.criterionYear')} checked={year} onChange={setYear} />
              <CriterionCheckbox label={t('dedupWizard.criterionAuthors')} checked={authors} onChange={setAuthors} />
              <CriterionCheckbox label={t('dedupWizard.criterionJournal')} checked={journal} onChange={setJournal} />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={similarityEnabled}
                onChange={(e) => setSimilarityEnabled(e.target.checked)}
              />
              {t('dedupWizard.criterionSimilarity')}
            </label>
            <input
              type="range"
              min={50}
              max={100}
              value={similarity}
              disabled={!similarityEnabled}
              onChange={(e) => setSimilarity(Number(e.target.value))}
              className="disabled:opacity-50"
            />
            <span className="text-xs text-mut">{similarity}%</span>
          </div>

          <p className="text-xs text-mut">{t('dedupWizard.autoResolverSafetyNote')}</p>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <IconButton icon={<XIcon />} label={t('common.cancel')} onClick={handleClose} />
            <Button disabled={!anyCriterionSelected} onClick={() => setConfirmOpen(true)}>
              {t('dedupWizard.autoResolve')}
            </Button>
          </div>
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('dedupWizard.confirmTitle')}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg">{t('dedupWizard.confirmBody')}</p>
          <div className="flex justify-end gap-2">
            <IconButton icon={<XIcon />} label={t('common.cancel')} onClick={() => setConfirmOpen(false)} />
            <Button onClick={handleResolve} disabled={autoResolve.isPending}>
              {autoResolve.isPending ? t('dedupWizard.resolving') : t('dedupWizard.autoResolve')}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  )
}

function CriterionCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-fg">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
