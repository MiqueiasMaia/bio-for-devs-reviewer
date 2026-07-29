import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import type { ProjectOutletContext } from '@/features/projects/ProjectLayout'
import { useCriteria, useExclusionReasons, useHighlightTerms } from '@/features/projects/settings/hooks'
import { HighlightedText } from '@/components/HighlightedText'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import type { Decision, ScreeningStage } from '@/types/domain'
import { useQueue, useMyScreenings, useQueueSummary, useSaveScreening, useReconcileDrafts } from './hooks'
import { saveNotesOnlyDraft } from './hooks'
import { downloadCsv, exportDecisionsCsv, importLegacyDecisionsCsv } from './csvRoundTrip'
import { FulltextPanel } from '@/features/fulltext/FulltextPanel'
import { ErrorState } from '@/components/ErrorState'

type FilterValue = 'all' | 'undecided' | Decision

const DECISION_STYLES: Record<Decision, string> = {
  INCLUDE: 'border-include text-include data-[sel=true]:bg-include data-[sel=true]:text-white',
  UNCERTAIN: 'border-uncertain text-uncertain data-[sel=true]:bg-uncertain data-[sel=true]:text-white',
  EXCLUDE: 'border-exclude text-exclude data-[sel=true]:bg-exclude data-[sel=true]:text-white',
}

export function ScreeningWorkspacePage() {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const reviewerId = user!.id
  const reviewersRequired = project.settings.reviewers_required_per_record

  const [stage, setStage] = useState<ScreeningStage>(project.settings.stages_enabled[0] ?? 'title_abstract')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [index, setIndex] = useState(0)
  const [hlOn, setHlOn] = useState(true)
  const [decisionDraft, setDecisionDraft] = useState<Decision | null>(null)
  const [reasonsDraft, setReasonsDraft] = useState<string[]>([])
  const [notesDraft, setNotesDraft] = useState('')
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const queue = useQueue(project.id, stage, reviewerId, reviewersRequired)
  const myScreenings = useMyScreenings(project.id, stage, reviewerId)
  const summary = useQueueSummary(project.id, stage, reviewerId)
  const highlightTerms = useHighlightTerms(project.id)
  const exclusionReasons = useExclusionReasons(project.id)
  const criteria = useCriteria(project.id)
  const saveScreening = useSaveScreening(project.id, stage, reviewerId)
  useReconcileDrafts(stage, reviewerId, saveScreening)

  // Keeps whichever record is currently open on screen from disappearing out
  // from under the reviewer the instant a decision is saved for it — e.g.
  // marking EXCLUDE (or picking its first reason) immediately updates
  // myScreenings, which would otherwise drop it from the "undecided"/
  // per-decision filter mid-edit and silently shift `current` to the next
  // record before there's time to pick a reason. The pin only follows
  // records the reviewer is actively viewing; it's cleared on filter/stage
  // change and moves on the moment they navigate away on purpose.
  const pinnedIdRef = useRef<string | null>(null)

  const filteredQueue = useMemo(() => {
    const base = queue.data ?? []
    const pinnedId = pinnedIdRef.current
    if (filter === 'all') return base
    if (filter === 'undecided') return base.filter((r) => r.id === pinnedId || !myScreenings.data?.get(r.id)?.decision)
    return base.filter((r) => r.id === pinnedId || myScreenings.data?.get(r.id)?.decision === filter)
  }, [queue.data, filter, myScreenings.data])

  useEffect(() => {
    pinnedIdRef.current = null
    setIndex(0)
  }, [filter, stage])

  const current = filteredQueue[index]
  const currentState = current ? myScreenings.data?.get(current.id) : undefined

  useEffect(() => {
    pinnedIdRef.current = current?.id ?? null
    setDecisionDraft(currentState?.decision ?? null)
    setReasonsDraft(currentState?.reasons ?? [])
    setNotesDraft(currentState?.notes ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  function go(delta: number) {
    setIndex((i) => Math.max(0, Math.min(filteredQueue.length - 1, i + delta)))
  }

  function jumpUndecided() {
    const isUndecided = (r: (typeof filteredQueue)[number]) => !myScreenings.data?.get(r.id)?.decision
    let found = filteredQueue.findIndex((r, i) => i > index && isUndecided(r))
    if (found < 0) found = filteredQueue.findIndex(isUndecided)
    if (found >= 0) setIndex(found)
  }

  // Full-text exclusions must carry a reason (spec §6); title/abstract
  // exclusions don't require one. The reasons panel still opens immediately
  // either way — only the actual save is gated at full_text.
  const reasonRequired = stage === 'full_text'

  function handleDecision(d: Decision) {
    if (!current) return
    setDecisionDraft(d)
    const reasons = d === 'EXCLUDE' ? reasonsDraft : []
    if (d !== 'EXCLUDE') setReasonsDraft([])
    if (d === 'EXCLUDE' && reasonRequired && reasons.length === 0) return
    saveScreening.mutate({ recordId: current.id, decision: d, reasons, notes: notesDraft })
    if (d !== 'EXCLUDE' && project.settings.auto_advance_on_decision) {
      setTimeout(() => go(1), 180)
    }
  }

  function toggleReason(code: string) {
    if (!current) return
    setReasonsDraft((prev) => {
      const next = prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
      if (decisionDraft === 'EXCLUDE' && next.length > 0) {
        saveScreening.mutate({ recordId: current.id, decision: 'EXCLUDE', reasons: next, notes: notesDraft })
      }
      return next
    })
  }

  function handleNotesBlur() {
    if (!current) return
    if (decisionDraft) {
      saveScreening.mutate({ recordId: current.id, decision: decisionDraft, reasons: reasonsDraft, notes: notesDraft })
    } else {
      saveNotesOnlyDraft(current.id, stage, reviewerId, notesDraft)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return
      const key = e.key.toLowerCase()
      if (key === 'i') handleDecision('INCLUDE')
      else if (key === 'u') handleDecision('UNCERTAIN')
      else if (key === 'e') handleDecision('EXCLUDE')
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  const termSets = useMemo(
    () => (highlightTerms.data ?? []).map((h) => ({ category: h.category, terms: h.terms, color: h.color })),
    [highlightTerms.data],
  )

  async function handleExport() {
    const csv = await exportDecisionsCsv(project.id)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`decisoes_${project.id.slice(0, 8)}_${stamp}.csv`, csv)
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const result = await importLegacyDecisionsCsv(project.id, text, reviewerId, stage)
      setImportMessage(t('screening.importSuccess', { imported: result.imported, skipped: result.skipped }))
      queue.refetch()
      myScreenings.refetch()
      summary.refetch()
    } catch {
      setImportMessage(t('screening.importError'))
    }
  }

  const inclusionCriteria = criteria.data?.filter((c) => c.kind === 'inclusion') ?? []
  const exclusionCriteria = criteria.data?.filter((c) => c.kind === 'exclusion') ?? []

  return (
    <div>
      <div className="sticky top-[57px] z-[5] -mx-6 mb-4 flex flex-wrap items-center gap-3 border-b border-line bg-bg/95 px-6 py-3 backdrop-blur">
        {project.settings.stages_enabled.length > 1 && (
          <div className="flex gap-1">
            {project.settings.stages_enabled.map((s) => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={clsx(
                  'rounded-md px-2 py-1 text-xs font-medium',
                  stage === s ? 'bg-fg text-white' : 'text-mut hover:bg-white',
                )}
              >
                {s === 'title_abstract' ? t('screening.stageTitleAbstract') : t('screening.stageFullText')}
              </button>
            ))}
          </div>
        )}
        {summary.data && (
          <div className="flex flex-1 min-w-40 items-center gap-2 text-xs text-mut">
            <span>
              {summary.data.include + summary.data.uncertain + summary.data.exclude}/{summary.data.total}
            </span>
            <div className="h-2 flex-1 min-w-24 overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-include transition-[width]"
                style={{
                  width: `${summary.data.total ? (100 * (summary.data.include + summary.data.uncertain + summary.data.exclude)) / summary.data.total : 0}%`,
                }}
              />
            </div>
          </div>
        )}
        <Select label="" aria-label="filtro" value={filter} onChange={(e) => setFilter(e.target.value as FilterValue)}>
          <option value="all">{t('screening.filterAll')}</option>
          <option value="undecided">{t('screening.filterUndecided')}</option>
          <option value="INCLUDE">{t('screening.filterInclude')}</option>
          <option value="UNCERTAIN">{t('screening.filterUncertain')}</option>
          <option value="EXCLUDE">{t('screening.filterExclude')}</option>
        </Select>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleImportFile(f)
            e.target.value = ''
          }}
        />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          {t('screening.importCsv')}
        </Button>
        <Button variant="secondary" onClick={handleExport}>
          {t('screening.exportCsv')}
        </Button>
      </div>

      {importMessage && <p className="mb-3 text-sm text-include">{importMessage}</p>}

      <p className="mb-4 text-xs text-mut">{t('screening.blindNotice')}</p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border border-line bg-white p-6">
          {queue.isError ? (
            <ErrorState onRetry={() => queue.refetch()} />
          ) : !current ? (
            <p className="py-16 text-center text-sm text-mut">
              {queue.isLoading ? t('common.loading') : filteredQueue.length === 0 && (queue.data?.length ?? 0) === 0 ? t('screening.emptyQueue') : t('screening.noRecords')}
            </p>
          ) : (
            <>
              <div className="mb-1 text-xs text-mut">
                {current.humanRef} · {current.year ?? '—'} · fonte: {current.sourceDb ?? '—'}
              </div>
              <p className="mb-2 text-xl font-semibold leading-snug text-fg">
                <HighlightedText text={current.title || t('common.untitled')} termSets={termSets} enabled={hlOn} />
              </p>
              <div className="mb-4 text-sm italic text-mut">{current.authors}</div>
              {current.abstract ? (
                <div className="whitespace-pre-wrap text-[15px] text-fg">
                  <HighlightedText text={current.abstract} termSets={termSets} enabled={hlOn} />
                </div>
              ) : (
                <div className="italic text-red-700">{t('screening.emptyAbstract')}</div>
              )}
              {current.doi && (
                <div className="mt-3 text-xs">
                  DOI:{' '}
                  <a
                    className="text-include"
                    href={`https://doi.org/${current.doi}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {current.doi}
                  </a>
                </div>
              )}

              {termSets.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-mut">
                  <span>{t('screening.legend')}</span>
                  {termSets.map((s) => (
                    <span
                      key={s.category}
                      className="rounded px-1.5 py-0.5"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.category}
                    </span>
                  ))}
                  <button className="ml-auto cursor-pointer underline" onClick={() => setHlOn((v) => !v)}>
                    {hlOn ? t('screening.hideHighlights') : t('screening.showHighlights')}
                  </button>
                </div>
              )}

              <div className="mt-6 flex gap-2.5">
                {(['INCLUDE', 'UNCERTAIN', 'EXCLUDE'] as Decision[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    data-sel={decisionDraft === d}
                    aria-pressed={decisionDraft === d}
                    onClick={() => handleDecision(d)}
                    className={clsx(
                      'flex-1 rounded-lg border-2 py-3 text-[15px] font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-include',
                      DECISION_STYLES[d],
                    )}
                  >
                    {d === 'INCLUDE' ? t('screening.include') : d === 'UNCERTAIN' ? t('screening.uncertain') : t('screening.exclude')}{' '}
                    <span className="text-[11px] font-medium opacity-60">
                      ({d === 'INCLUDE' ? 'I' : d === 'UNCERTAIN' ? 'U' : 'E'})
                    </span>
                  </button>
                ))}
              </div>

              {decisionDraft === 'EXCLUDE' && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-red-800">{t('screening.reasonsLabel')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(exclusionReasons.data ?? []).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={reasonsDraft.includes(r.code)}
                        onClick={() => toggleReason(r.code)}
                        className={clsx(
                          'rounded-full border px-2.5 py-1 text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-include',
                          reasonsDraft.includes(r.code)
                            ? 'border-red-700 bg-red-700 text-white'
                            : 'border-red-300 text-red-700',
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {reasonRequired && reasonsDraft.length === 0 && (
                    <p className="mt-2 text-xs font-medium text-red-800">{t('fulltext.reasonRequired')}</p>
                  )}
                </div>
              )}

              {stage === 'full_text' && (
                <div className="mt-3">
                  <FulltextPanel recordId={current.id} projectId={project.id} doi={current.doi} />
                </div>
              )}

              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder={t('screening.notesPlaceholder')}
                className="mt-3 min-h-12 w-full rounded-md border border-line px-3 py-2 text-sm"
              />

              <div className="mt-4 flex items-center justify-between gap-3">
                <Button variant="secondary" onClick={() => go(-1)} disabled={index === 0}>
                  ← {t('screening.prev')}
                </Button>
                <span className="text-sm text-mut">
                  {index + 1} {t('screening.counter')} {filteredQueue.length}
                </span>
                <Button variant="secondary" onClick={jumpUndecided}>
                  {t('screening.jumpUndecided')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => go(1)}
                  disabled={index >= filteredQueue.length - 1}
                >
                  {t('screening.next')} →
                </Button>
              </div>
              <p className="mt-2 text-center text-[11px] text-mut">{t('screening.autosaved')}</p>

              {summary.data && (
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px]">
                  <span className="rounded-full border border-line bg-[#e7f1f4] px-2 py-0.5 font-semibold text-include">
                    {t('screening.include')} {summary.data.include}
                  </span>
                  <span className="rounded-full border border-line bg-[#fbefdc] px-2 py-0.5 font-semibold text-uncertain">
                    {t('screening.uncertain')} {summary.data.uncertain}
                  </span>
                  <span className="rounded-full border border-line bg-[#eef1f3] px-2 py-0.5 font-semibold text-mut">
                    {t('screening.exclude')} {summary.data.exclude}
                  </span>
                  <span className="rounded-full border border-line px-2 py-0.5 font-semibold text-red-700">
                    {t('screening.filterUndecided')} {summary.data.undecided}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="h-fit rounded-xl border border-line bg-white p-4 text-[12.5px]">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mut">PICOTS</h2>
          <div className="mb-3">
            <p className="mb-1 font-bold text-include">{t('criteria.inclusion')}</p>
            <ul className="ml-4 list-disc space-y-0.5 text-mut">
              {inclusionCriteria.map((c) => (
                <li key={c.id}>{c.text}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-bold text-red-700">{t('criteria.exclusion')}</p>
            <ul className="ml-4 list-disc space-y-0.5 text-mut">
              {exclusionCriteria.map((c) => (
                <li key={c.id}>{c.text}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
