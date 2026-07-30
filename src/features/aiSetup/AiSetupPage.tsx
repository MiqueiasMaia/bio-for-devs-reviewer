import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { CheckIcon, CopyIcon } from '@/components/ui/icons'
import type { ProjectOutletContext } from '../projects/ProjectLayout'
import { useCriteria, useExclusionReasons, useHighlightTerms } from '@/features/projects/settings/hooks'
import { buildAiSetupPrompt } from '@/domain/aiSetup/promptBuilder'
import { aiSetupResultSchema } from '@/domain/aiSetup/schema'
import { useImportAiSetupResult } from './hooks'

function nextOrderIndex(items: { orderIndex: number }[] | undefined): number {
  return items && items.length > 0 ? Math.max(...items.map((i) => i.orderIndex)) + 1 : 1
}

export function AiSetupPage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { t } = useTranslation()
  const { data: criteria } = useCriteria(project.id)
  const { data: highlightTerms } = useHighlightTerms(project.id)
  const { data: exclusionReasons } = useExclusionReasons(project.id)
  const importResult = useImportAiSetupResult(project.id)

  const [protocolText, setProtocolText] = useState('')
  const [prompt, setPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importedSummary, setImportedSummary] = useState<{
    criteriaAdded: number
    highlightTermsAdded: number
    exclusionReasonsAdded: number
    skipped: number
  } | null>(null)

  function handleGeneratePrompt() {
    setPrompt(
      buildAiSetupPrompt({
        projectName: project.name,
        prosperoId: project.prosperoId,
        protocolText,
      }),
    )
    setCopied(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
  }

  function handleImport() {
    setParseError(null)
    setImportError(null)
    setImportedSummary(null)
    let raw: unknown
    try {
      raw = JSON.parse(jsonInput)
    } catch {
      setParseError(t('aiSetup.invalidJson'))
      return
    }
    const result = aiSetupResultSchema.safeParse(raw)
    if (!result.success) {
      setParseError(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '))
      return
    }
    const parsed = result.data
    importResult.mutate(
      {
        parsed,
        startIndex: {
          criteria: nextOrderIndex(criteria),
          highlightTerms: nextOrderIndex(highlightTerms),
          exclusionReasons: nextOrderIndex(exclusionReasons),
        },
      },
      {
        onSuccess: (data) => {
          setImportedSummary(data)
          setJsonInput('')
        },
        onError: () => {
          setImportError(t('aiSetup.importError'))
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-fg">{t('aiSetup.title')}</h2>
        <p className="text-sm text-mut">{t('aiSetup.subtitle')}</p>
      </div>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-fg">{t('aiSetup.step1Title')}</h3>
        <p className="text-xs text-mut">{t('aiSetup.step1Hint')}</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="protocol-text" className="text-sm font-medium text-fg">
            {t('aiSetup.protocolLabel')}
          </label>
          <textarea
            id="protocol-text"
            className="min-h-32 border border-line px-3 py-2 text-sm"
            value={protocolText}
            onChange={(e) => setProtocolText(e.target.value)}
            placeholder={t('aiSetup.protocolPlaceholder')}
          />
        </div>
        <Button className="self-start" onClick={handleGeneratePrompt}>
          {t('aiSetup.generatePrompt')}
        </Button>

        {prompt && (
          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <label htmlFor="generated-prompt" className="text-sm font-medium text-fg">
                {t('aiSetup.generatedPromptLabel')}
              </label>
              <IconButton
                icon={copied ? <CheckIcon /> : <CopyIcon />}
                label={copied ? t('aiSetup.copied') : t('aiSetup.copy')}
                onClick={handleCopy}
              />
            </div>
            <textarea id="generated-prompt" readOnly className="min-h-64 border border-line px-3 py-2 font-mono text-xs" value={prompt} />
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-fg">{t('aiSetup.step2Title')}</h3>
        <p className="text-xs text-mut">{t('aiSetup.step2Hint')}</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ai-json" className="text-sm font-medium text-fg">
            {t('aiSetup.jsonLabel')}
          </label>
          <textarea
            id="ai-json"
            className="min-h-40 border border-line px-3 py-2 font-mono text-xs"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="{ &quot;criteria&quot;: [...], &quot;highlightTerms&quot;: [...], &quot;exclusionReasons&quot;: [...] }"
          />
        </div>
        {parseError && <p className="text-sm text-red-700">{parseError}</p>}
        {importError && <p className="text-sm text-red-700">{importError}</p>}
        {importedSummary && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-include">
              {t('aiSetup.importSuccess', {
                criteria: importedSummary.criteriaAdded,
                highlightTerms: importedSummary.highlightTermsAdded,
                exclusionReasons: importedSummary.exclusionReasonsAdded,
              })}
            </p>
            {importedSummary.skipped > 0 && (
              <p className="text-sm text-uncertain">
                {t('aiSetup.importSkipped', { count: importedSummary.skipped })}
              </p>
            )}
          </div>
        )}
        <Button
          className="self-start"
          disabled={!jsonInput.trim() || importResult.isPending}
          onClick={handleImport}
        >
          {importResult.isPending ? t('aiSetup.importing') : t('aiSetup.import')}
        </Button>
      </Card>
    </div>
  )
}
