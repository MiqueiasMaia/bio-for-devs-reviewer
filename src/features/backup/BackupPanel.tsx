import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Tooltip } from '@/components/ui/Tooltip'
import { DownloadIcon, UploadIcon } from '@/components/ui/icons'
import type { ProjectSettings } from '@/types/domain'
import { downloadJson, exportProjectBackup } from './api'
import { useImportBackup } from './hooks'
import { isValidProjectBackup } from './schema'
import { fetchIncludedRecords } from './referenceApi'
import { buildBibtex, buildRis } from '@/domain/referenceExport/referenceExport'

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function BackupPanel({ projectId, settings }: { projectId: string; settings: ProjectSettings }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const importBackup = useImportBackup()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [referenceMessage, setReferenceMessage] = useState<string | null>(null)

  const finalStage = settings.stages_enabled.includes('full_text') ? 'full_text' : 'title_abstract'

  async function handleExportJson() {
    const backup = await exportProjectBackup(projectId)
    downloadJson(`backup_${projectId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.json`, backup)
  }

  async function handleImportFile(file: File) {
    const text = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      importBackup.reset()
      alert(t('backup.invalidFile'))
      return
    }
    if (!isValidProjectBackup(parsed) || !user) {
      alert(t('backup.invalidFile'))
      return
    }
    const result = await importBackup.mutateAsync([parsed, user.id])
    navigate(`/projects/${result.projectId}`)
  }

  async function handleExportRis() {
    const records = await fetchIncludedRecords(projectId, finalStage)
    if (records.length === 0) {
      setReferenceMessage(t('backup.noIncluded'))
      return
    }
    downloadText(`incluidos_${projectId.slice(0, 8)}.ris`, buildRis(records), 'application/x-research-info-systems')
  }

  async function handleExportBibtex() {
    const records = await fetchIncludedRecords(projectId, finalStage)
    if (records.length === 0) {
      setReferenceMessage(t('backup.noIncluded'))
      return
    }
    downloadText(`incluidos_${projectId.slice(0, 8)}.bib`, buildBibtex(records), 'application/x-bibtex')
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-fg">{t('backup.title')}</h3>
        <p className="text-xs text-mut">{t('backup.subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Tooltip label={t('backup.exportJson')} side="top">
          <Button
            variant="secondary"
            onClick={handleExportJson}
            aria-label={t('backup.exportJson')}
            className="inline-flex items-center gap-1.5"
          >
            <DownloadIcon /> JSON
          </Button>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleImportFile(f)
            e.target.value = ''
          }}
        />
        <IconButton
          icon={<UploadIcon />}
          label={importBackup.isPending ? t('backup.importing') : t('backup.importJson')}
          onClick={() => fileInputRef.current?.click()}
          disabled={importBackup.isPending}
        />
        <Tooltip label={t('backup.exportRis')} side="top">
          <Button
            variant="secondary"
            onClick={handleExportRis}
            aria-label={t('backup.exportRis')}
            className="inline-flex items-center gap-1.5"
          >
            <DownloadIcon /> RIS
          </Button>
        </Tooltip>
        <Tooltip label={t('backup.exportBibtex')} side="top">
          <Button
            variant="secondary"
            onClick={handleExportBibtex}
            aria-label={t('backup.exportBibtex')}
            className="inline-flex items-center gap-1.5"
          >
            <DownloadIcon /> BibTeX
          </Button>
        </Tooltip>
      </div>

      {importBackup.isSuccess && (
        <p className="text-sm text-include">
          {t('backup.importSuccess', {
            records: importBackup.data.recordCount,
            screenings: importBackup.data.screeningCount,
            skipped: importBackup.data.skippedScreenings,
          })}
        </p>
      )}
      {importBackup.isError && <p className="text-sm text-red-600">{t('backup.importError')}</p>}
      {referenceMessage && <p className="text-sm text-mut">{referenceMessage}</p>}
    </Card>
  )
}
