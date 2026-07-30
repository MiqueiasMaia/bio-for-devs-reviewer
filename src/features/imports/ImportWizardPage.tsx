import { useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useTranslation, type TranslationKey } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import type { ProjectOutletContext } from '@/features/projects/ProjectLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import {
  CSV_TARGET_FIELDS,
  guessCsvMapping,
  isLegacySchema,
  mapCsvRow,
  mapLegacyCsvRow,
  parseCsvText,
  type CsvFieldMapping,
  type CsvTargetField,
} from '@/domain/import/csv'
import type { ParsedRecord } from '@/domain/import/types'
import { detectFormat, parseByFormat } from './importPipeline'
import { useRunImport } from './hooks'
import type { ImportFormat } from '@/types/domain'

const FIELD_LABEL_KEYS: Record<CsvTargetField, TranslationKey> = {
  title: 'importWizard.field_title',
  authors: 'importWizard.field_authors',
  abstract: 'importWizard.field_abstract',
  year: 'importWizard.field_year',
  doi: 'importWizard.field_doi',
  pmid: 'importWizard.field_pmid',
  journal: 'importWizard.field_journal',
  sourceDb: 'importWizard.field_sourceDb',
}

export function ImportWizardPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const runImport = useRunImport(project.id)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sourceName, setSourceName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<ImportFormat | null>(null)
  const [fileText, setFileText] = useState<string>('')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [csvMapping, setCsvMapping] = useState<CsvFieldMapping>({})
  const [isLegacy, setIsLegacy] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  async function handleFileChange(selected: File | null) {
    setFile(selected)
    setParseError(null)
    if (!selected) {
      setFormat(null)
      return
    }
    const detected = detectFormat(selected.name)
    if (!detected) {
      setFormat(null)
      setParseError(t('importWizard.unsupportedFormat'))
      return
    }
    setFormat(detected)
    const text = await selected.text()
    setFileText(text)

    if (detected === 'csv') {
      const { headers, rows } = parseCsvText(text)
      setCsvHeaders(headers)
      setCsvRows(rows)
      const legacy = isLegacySchema(headers)
      setIsLegacy(legacy)
      setCsvMapping(legacy ? {} : guessCsvMapping(headers))
    }
  }

  const parsedRecords: ParsedRecord[] = useMemo(() => {
    if (!format || !fileText) return []
    if (format === 'csv') {
      if (isLegacy) return csvRows.map(mapLegacyCsvRow)
      return csvRows.map((row) => mapCsvRow(row, csvMapping))
    }
    return parseByFormat(format, fileText)
  }, [format, fileText, isLegacy, csvRows, csvMapping])

  async function handleImport() {
    if (!file || !format || !user || !sourceName.trim()) return
    const result = await runImport.mutateAsync({
      sourceName: sourceName.trim(),
      file,
      format,
      records: parsedRecords,
      importedBy: user.id,
      dedupSettings: project.settings.dedup,
    })
    if (result.dedupGroupCount > 0) {
      navigate(`/projects/${project.id}/duplicates`)
    } else {
      navigate(`/projects/${project.id}`)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('importWizard.title')}</h2>
        <p className="text-sm text-mut">{t('importWizard.subtitle')}</p>
      </div>

      <Card className="flex flex-col gap-4">
        <TextField
          label={`${t('importWizard.sourceName')} *`}
          placeholder={t('importWizard.sourceNamePlaceholder')}
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          required
        />
        {!sourceName.trim() && <p className="text-xs text-mut">{t('importWizard.sourceNameRequired')}</p>}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">{t('importWizard.chooseFile')}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ris,.nbib,.csv,.txt"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              {t('importWizard.chooseFile')}
            </Button>
            <span className="text-sm text-mut">{file ? file.name : t('importWizard.noFile')}</span>
          </div>
          {parseError && <p className="text-sm text-red-600">{parseError}</p>}
          {format && (
            <p className="text-sm text-mut">
              {t('importWizard.detectedFormat')}: <strong>{format.toUpperCase()}</strong>
            </p>
          )}
        </div>
      </Card>

      {format === 'csv' && isLegacy && (
        <Card className="border-l-4 border-l-uncertain">
          <p className="text-sm text-fg">{t('importWizard.legacyDetected')}</p>
        </Card>
      )}

      {format === 'csv' && !isLegacy && csvHeaders.length > 0 && (
        <Card>
          <h3 className="mb-1 text-sm font-semibold text-fg">{t('importWizard.mappingTitle')}</h3>
          <p className="mb-3 text-sm text-mut">{t('importWizard.mappingHint')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CSV_TARGET_FIELDS.map((field) => (
              <Select
                key={field}
                label={t(FIELD_LABEL_KEYS[field])}
                value={csvMapping[field] ?? ''}
                onChange={(e) =>
                  setCsvMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))
                }
              >
                <option value="">{t('importWizard.columnUnmapped')}</option>
                {csvHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            ))}
          </div>
        </Card>
      )}

      {parsedRecords.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-fg">
            {t('importWizard.previewTitle')} — {parsedRecords.length} {t('importWizard.recordsFound')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-mut">
                  <th className="py-1 pr-3">{t(FIELD_LABEL_KEYS.title)}</th>
                  <th className="py-1 pr-3">{t(FIELD_LABEL_KEYS.authors)}</th>
                  <th className="py-1 pr-3">{t(FIELD_LABEL_KEYS.year)}</th>
                  <th className="py-1 pr-3">{t(FIELD_LABEL_KEYS.doi)}</th>
                </tr>
              </thead>
              <tbody>
                {parsedRecords.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-b-0">
                    <td className="max-w-xs truncate py-1 pr-3">{r.title || '—'}</td>
                    <td className="max-w-40 truncate py-1 pr-3">{r.authors || '—'}</td>
                    <td className="py-1 pr-3">{r.year ?? '—'}</td>
                    <td className="max-w-32 truncate py-1 pr-3">{r.doi ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {runImport.isError && <p className="mt-3 text-sm text-red-600">{t('importWizard.importError')}</p>}

          <div className="mt-4 flex justify-end">
            <Button onClick={handleImport} disabled={runImport.isPending || !sourceName.trim()}>
              {runImport.isPending ? t('importWizard.importing') : t('importWizard.import')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
