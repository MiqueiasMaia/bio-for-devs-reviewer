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
import { TextField } from '@/components/ui/TextField'
import { DownloadIcon, UploadIcon } from '@/components/ui/icons'
import { StageGate } from '@/components/StageGate'
import { getApplicableStages, getNextStage, isStageUnlocked } from '@/domain/stageLock/stageLock'
import { useUnlockStage } from '@/features/projects/hooks'
import type { Decision, ScreeningStage } from '@/types/domain'
import { useQueue, useMyScreenings, useQueueSummary, useAiMatchForStage, useSaveScreening, useReconcileDrafts } from './hooks'
import { saveNotesOnlyDraft } from './hooks'
import { computeAiMatchBadge } from './aiMatchBadge'
import { downloadCsv, exportDecisionsCsv, importLegacyDecisionsCsv } from './csvRoundTrip'
import { getDailyGoal, getLastPosition, saveLastPosition, setDailyGoal } from './sessionTracker'
import { useTranslateRecord } from '@/features/translation/hooks'
import { FulltextPanel } from '@/features/fulltext/FulltextPanel'
import { useFulltextAttachedRecordIds } from '@/features/fulltext/hooks'
import { ErrorState } from '@/components/ErrorState'

type FilterValue = 'all' | 'undecided' | Decision
type FulltextFilterValue = 'all' | 'attached' | 'missing'

const DECISION_STYLES: Record<Decision, string> = {
  INCLUDE: 'border-include text-include data-[sel=true]:bg-include data-[sel=true]:text-white',
  UNCERTAIN: 'border-uncertain text-uncertain data-[sel=true]:bg-uncertain data-[sel=true]:text-white',
  EXCLUDE: 'border-exclude text-exclude data-[sel=true]:bg-exclude data-[sel=true]:text-white',
}

export function ScreeningWorkspacePage({ stage }: { stage: ScreeningStage }) {
  const { project } = useOutletContext<ProjectOutletContext>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const reviewerId = user!.id
  const reviewersRequired = project.settings.reviewers_required_per_record

  const [filter, setFilter] = useState<FilterValue>('all')
  const [titleSearch, setTitleSearch] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [sourceDbFilter, setSourceDbFilter] = useState('all')
  const [journalFilter, setJournalFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [exclusionReasonFilter, setExclusionReasonFilter] = useState('all')
  const [fulltextFilter, setFulltextFilter] = useState<FulltextFilterValue>('all')
  const [index, setIndex] = useState(0)
  const [hlOn, setHlOn] = useState(true)
  const [showInclusionCriteria, setShowInclusionCriteria] = useState(false)
  const [showExclusionCriteria, setShowExclusionCriteria] = useState(false)
  const [decisionDraft, setDecisionDraft] = useState<Decision | null>(null)
  const [reasonsDraft, setReasonsDraft] = useState<string[]>([])
  const [notesDraft, setNotesDraft] = useState('')
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [showResumedNote, setShowResumedNote] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [dailyGoal, setDailyGoalState] = useState(() => getDailyGoal(reviewerId, stage, project.id))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const queue = useQueue(project.id, stage, reviewerId, reviewersRequired)
  const myScreenings = useMyScreenings(project.id, stage, reviewerId)
  const summary = useQueueSummary(project.id, stage, reviewerId)
  const applicableStages = useMemo(() => getApplicableStages(project.settings), [project.settings])
  const nextStage = getNextStage(stage, applicableStages)
  const nextStageAlreadyUnlocked = !nextStage || isStageUnlocked(nextStage, project.settings.unlocked_stages, applicableStages)
  const showUnlockCta = summary.data?.undecided === 0 && (summary.data?.total ?? 0) > 0 && !!nextStage && !nextStageAlreadyUnlocked
  const isOwner = project.ownerId === user?.id
  const { unlock, isPending: unlocking } = useUnlockStage(project.id)
  // Only shown when the AI is a triage aid, not a formal co-reviewer — if
  // ai_counts_as_reviewer is on, its decision is one of the "reviewers'
  // decisions" screening.blindNotice promises stays hidden until conflict
  // resolution, same as any human peer.
  const aiMatch = useAiMatchForStage(
    project.id,
    stage,
    project.settings.ai_screening_enabled && !project.settings.ai_counts_as_reviewer,
  )
  const highlightTerms = useHighlightTerms(project.id)
  const exclusionReasons = useExclusionReasons(project.id)
  const criteria = useCriteria(project.id)
  const fulltextAttachedIds = useFulltextAttachedRecordIds(project.id, stage === 'full_text')
  const saveScreening = useSaveScreening(project.id, stage, reviewerId)
  const translateRecord = useTranslateRecord()
  useReconcileDrafts(stage, reviewerId, saveScreening)

  // "Decisions this session" / "decisions today" — derived from
  // myScreenings' own decidedAt timestamps rather than any new tracking
  // table, per the "só decisões e %, sem tempo" call: no session/time
  // infrastructure in the backend, just a client-side reading of data
  // already fetched for other reasons.
  const sessionStartAtRef = useRef(Date.now())
  const resumedRef = useRef(false)

  const sessionCount = useMemo(() => {
    let count = 0
    for (const s of myScreenings.data?.values() ?? []) {
      if (new Date(s.decidedAt).getTime() >= sessionStartAtRef.current) count++
    }
    return count
  }, [myScreenings.data])

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    let count = 0
    for (const s of myScreenings.data?.values() ?? []) {
      if (s.decidedAt.slice(0, 10) === today) count++
    }
    return count
  }, [myScreenings.data])

  // Keeps whichever record is currently open on screen from disappearing out
  // from under the reviewer the instant a decision is saved for it — e.g.
  // marking EXCLUDE (or picking its first reason) immediately updates
  // myScreenings, which would otherwise drop it from the "undecided"/
  // per-decision filter mid-edit and silently shift `current` to the next
  // record before there's time to pick a reason. The pin only follows
  // records the reviewer is actively viewing; it's cleared on filter/stage
  // change and moves on the moment they navigate away on purpose.
  const pinnedIdRef = useRef<string | null>(null)

  // Option lists for the source/journal/year selects come from whatever's
  // actually in the queue (not a fixed list) — always computed from the full
  // queue, not the already-filtered one, so picking one facet never makes
  // another facet's options disappear.
  const sourceDbOptions = useMemo(
    () => Array.from(new Set((queue.data ?? []).map((r) => r.sourceDb).filter((v): v is string => Boolean(v)))).sort(),
    [queue.data],
  )
  const journalOptions = useMemo(
    () => Array.from(new Set((queue.data ?? []).map((r) => r.journal).filter((v): v is string => Boolean(v)))).sort(),
    [queue.data],
  )
  const yearOptions = useMemo(
    () =>
      Array.from(new Set((queue.data ?? []).map((r) => r.year).filter((v): v is number => v != null))).sort(
        (a, b) => b - a,
      ),
    [queue.data],
  )

  const activeExtraFilterCount =
    (titleSearch.trim() ? 1 : 0) +
    (authorSearch.trim() ? 1 : 0) +
    [sourceDbFilter, journalFilter, yearFilter, exclusionReasonFilter, fulltextFilter].filter((v) => v !== 'all').length

  function clearExtraFilters() {
    setTitleSearch('')
    setAuthorSearch('')
    setSourceDbFilter('all')
    setJournalFilter('all')
    setYearFilter('all')
    setExclusionReasonFilter('all')
    setFulltextFilter('all')
  }

  const filteredQueue = useMemo(() => {
    const base = queue.data ?? []
    const pinnedId = pinnedIdRef.current
    const titleQuery = titleSearch.trim().toLowerCase()
    const authorQuery = authorSearch.trim().toLowerCase()

    const matchesDecision = (r: (typeof base)[number]) => {
      if (filter === 'all') return true
      if (filter === 'undecided') return !myScreenings.data?.get(r.id)?.decision
      return myScreenings.data?.get(r.id)?.decision === filter
    }

    const matches = (r: (typeof base)[number]) => {
      if (!matchesDecision(r)) return false
      if (titleQuery && !r.title.toLowerCase().includes(titleQuery)) return false
      if (authorQuery && !r.authors.toLowerCase().includes(authorQuery)) return false
      if (sourceDbFilter !== 'all' && r.sourceDb !== sourceDbFilter) return false
      if (journalFilter !== 'all' && r.journal !== journalFilter) return false
      if (yearFilter !== 'all' && String(r.year ?? '') !== yearFilter) return false
      if (exclusionReasonFilter !== 'all' && !myScreenings.data?.get(r.id)?.reasons.includes(exclusionReasonFilter)) {
        return false
      }
      if (fulltextFilter !== 'all') {
        const attached = fulltextAttachedIds.data?.has(r.id) ?? false
        if (fulltextFilter === 'attached' && !attached) return false
        if (fulltextFilter === 'missing' && attached) return false
      }
      return true
    }

    return base.filter((r) => r.id === pinnedId || matches(r))
  }, [
    queue.data,
    filter,
    myScreenings.data,
    titleSearch,
    authorSearch,
    sourceDbFilter,
    journalFilter,
    yearFilter,
    exclusionReasonFilter,
    fulltextFilter,
    fulltextAttachedIds.data,
  ])

  useEffect(() => {
    pinnedIdRef.current = null
    setIndex(0)
  }, [filter, stage, titleSearch, authorSearch, sourceDbFilter, journalFilter, yearFilter, exclusionReasonFilter, fulltextFilter])

  // Picks up where the reviewer left off, once, the first time the queue
  // loads — localStorage only (see sessionTracker.ts), so it's just a UX
  // convenience local to this browser, not a fact worth syncing anywhere.
  useEffect(() => {
    if (resumedRef.current || !queue.data || queue.data.length === 0) return
    resumedRef.current = true
    const lastId = getLastPosition(reviewerId, stage, project.id)
    if (!lastId) return
    const idx = filteredQueue.findIndex((r) => r.id === lastId)
    if (idx >= 0) {
      setIndex(idx)
      setShowResumedNote(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.data])

  const current = filteredQueue[index]
  const currentState = current ? myScreenings.data?.get(current.id) : undefined

  useEffect(() => {
    pinnedIdRef.current = current?.id ?? null
    setDecisionDraft(currentState?.decision ?? null)
    setReasonsDraft(currentState?.reasons ?? [])
    setNotesDraft(currentState?.notes ?? '')
    setShowTranslation(false)
    if (current) saveLastPosition(reviewerId, stage, project.id, current.id)
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
    const isAdding = !reasonsDraft.includes(code)
    setReasonsDraft((prev) => {
      const next = prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
      if (decisionDraft === 'EXCLUDE' && next.length > 0) {
        saveScreening.mutate({ recordId: current.id, decision: 'EXCLUDE', reasons: next, notes: notesDraft })
      }
      return next
    })
    // Picking a reason is what "completes" an EXCLUDE decision (the
    // buttons alone don't, so there's time to choose one — see the pin
    // comment above). Once a reason is picked, advance the same way
    // INCLUDE/UNCERTAIN already do. Only on adding a reason, not removing
    // one — unchecking a reason is a correction, not a fresh decision.
    if (isAdding && decisionDraft === 'EXCLUDE' && project.settings.auto_advance_on_decision) {
      setTimeout(() => go(1), 180)
    }
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

  async function handleTranslate() {
    if (!current) return
    if (current.titleTranslated) {
      setShowTranslation((v) => !v)
      return
    }
    try {
      await translateRecord.mutateAsync({ id: current.id, title: current.title, abstract: current.abstract })
      await queue.refetch()
      setShowTranslation(true)
    } catch {
      setImportMessage(t('screening.translateError'))
    }
  }

  function handleSetGoal(value: string) {
    const goal = Number(value)
    if (Number.isFinite(goal) && goal > 0) {
      setDailyGoal(reviewerId, stage, project.id, goal)
      setDailyGoalState(goal)
    }
    setEditingGoal(false)
  }

  const inclusionCriteria = criteria.data?.filter((c) => c.kind === 'inclusion') ?? []
  const exclusionCriteria = criteria.data?.filter((c) => c.kind === 'exclusion') ?? []

  return (
    <StageGate project={project} stage={stage}>
    <div>
      <div className="sticky top-[57px] z-[5] -mx-6 mb-4 flex flex-wrap items-center gap-3 border-b border-line bg-bg/95 px-6 py-3 backdrop-blur">
        {summary.data && (
          <div className="flex flex-1 min-w-40 items-center gap-2 text-xs text-mut">
            <span>
              {summary.data.include + summary.data.uncertain + summary.data.exclude}/{summary.data.total}
            </span>
            <div className="h-2 flex-1 min-w-24 overflow-hidden bg-line">
              <div
                className="h-full bg-include transition-[width]"
                style={{
                  width: `${summary.data.total ? (100 * (summary.data.include + summary.data.uncertain + summary.data.exclude)) / summary.data.total : 0}%`,
                }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-mut">
          <span>{t('screening.sessionCount', { count: sessionCount })}</span>
          <span>·</span>
          {editingGoal ? (
            <input
              type="number"
              min={1}
              autoFocus
              defaultValue={dailyGoal ?? ''}
              onBlur={(e) => handleSetGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSetGoal((e.target as HTMLInputElement).value)
              }}
              className="w-14 border border-line px-1 py-0.5 text-xs"
            />
          ) : (
            <button type="button" className="cursor-pointer underline" onClick={() => setEditingGoal(true)}>
              {dailyGoal ? t('screening.todayProgress', { count: todayCount, goal: dailyGoal }) : t('screening.setGoal')}
            </button>
          )}
        </div>
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
        <Button
          variant="secondary"
          className="p-2"
          title={t('screening.importCsv')}
          aria-label={t('screening.importCsv')}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon />
        </Button>
        <Button
          variant="secondary"
          className="p-2"
          title={t('screening.exportCsv')}
          aria-label={t('screening.exportCsv')}
          onClick={handleExport}
        >
          <DownloadIcon />
        </Button>
      </div>

      {showResumedNote && (
        <p className="mb-3 flex items-center justify-between text-xs text-mut">
          <span>{t('screening.resumedNote')}</span>
          <button type="button" className="cursor-pointer underline" onClick={() => setShowResumedNote(false)}>
            ✕
          </button>
        </p>
      )}

      {importMessage && <p className="mb-3 text-sm text-include">{importMessage}</p>}

      <p className="mb-4 text-xs text-mut">{t('screening.blindNotice')}</p>

      {/* Capped width here (unlike the rest of the now-fluid app shell) —
          this is the one screen dominated by long-form reading (title +
          abstract), and letting it stretch edge-to-edge on wide monitors
          would make lines uncomfortably long. Filters live in the left
          column instead of a top bar — this screen has lateral room to
          spare (like the PICOTS column on the right) and vertical room is
          what's actually scarce while screening. */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[260px_1fr_300px]">
        <aside className="h-fit border border-line bg-white p-4 text-[12.5px]">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mut">{t('screening.moreFilters')}</h2>
          <div className="flex flex-col gap-3">
            <Select label="" aria-label="filtro" value={filter} onChange={(e) => setFilter(e.target.value as FilterValue)}>
              <option value="all">{t('screening.filterAll')}</option>
              <option value="undecided">{t('screening.filterUndecided')}</option>
              <option value="INCLUDE">{t('screening.filterInclude')}</option>
              <option value="UNCERTAIN">{t('screening.filterUncertain')}</option>
              <option value="EXCLUDE">{t('screening.filterExclude')}</option>
            </Select>
            <TextField
              label={t('screening.searchTitle')}
              placeholder={t('screening.searchTitlePlaceholder')}
              value={titleSearch}
              onChange={(e) => setTitleSearch(e.target.value)}
              className="w-full"
            />
            <TextField
              label={t('screening.searchAuthor')}
              placeholder={t('screening.searchAuthorPlaceholder')}
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              className="w-full"
            />
            <Select
              label={t('screening.filterSourceDb')}
              value={sourceDbFilter}
              onChange={(e) => setSourceDbFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">{t('screening.filterAll')}</option>
              {sourceDbOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              label={t('screening.filterJournal')}
              value={journalFilter}
              onChange={(e) => setJournalFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">{t('screening.filterAll')}</option>
              {journalOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              label={t('screening.filterYear')}
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">{t('screening.filterAll')}</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </Select>
            {(exclusionReasons.data ?? []).length > 0 && (
              <Select
                label={t('screening.filterExclusionReason')}
                value={exclusionReasonFilter}
                onChange={(e) => setExclusionReasonFilter(e.target.value)}
                className="w-full"
              >
                <option value="all">{t('screening.filterAll')}</option>
                {exclusionReasons.data!.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </Select>
            )}
            {stage === 'full_text' && (
              <Select
                label={t('screening.filterFulltext')}
                value={fulltextFilter}
                onChange={(e) => setFulltextFilter(e.target.value as FulltextFilterValue)}
                className="w-full"
              >
                <option value="all">{t('screening.filterAll')}</option>
                <option value="attached">{t('screening.filterFulltextAttached')}</option>
                <option value="missing">{t('screening.filterFulltextMissing')}</option>
              </Select>
            )}
            {activeExtraFilterCount > 0 && (
              <Button variant="ghost" onClick={clearExtraFilters}>
                {t('screening.clearFilters')}
              </Button>
            )}
          </div>
        </aside>

        <div className="border border-line bg-white p-6">
          {queue.isError ? (
            <ErrorState onRetry={() => queue.refetch()} />
          ) : !current ? (
            <p className="py-16 text-center text-sm text-mut">
              {queue.isLoading ? t('common.loading') : filteredQueue.length === 0 && (queue.data?.length ?? 0) === 0 ? t('screening.emptyQueue') : t('screening.noRecords')}
            </p>
          ) : (
            <>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-mut">
                <span className="flex items-center gap-2">
                  {current.humanRef} · {current.year ?? '—'} · fonte: {current.sourceDb ?? '—'}
                  {(() => {
                    const match = aiMatch.data?.get(current.id)
                    if (!match) return null
                    const badge = computeAiMatchBadge(match.decision, match.confidence)
                    return (
                      <span className={clsx('text-sm', badge.className)} title={t('screening.aiMatchHint')}>
                        {badge.icon}
                      </span>
                    )
                  })()}
                </span>
                <button
                  type="button"
                  className="cursor-pointer whitespace-nowrap underline disabled:cursor-wait disabled:opacity-50"
                  disabled={translateRecord.isPending}
                  onClick={handleTranslate}
                >
                  {translateRecord.isPending
                    ? t('screening.translating')
                    : showTranslation
                      ? t('screening.viewOriginal')
                      : t('screening.translate')}
                </button>
              </div>
              {showTranslation && current.titleTranslated && (
                <p className="mb-1 text-[11px] text-mut">{t('screening.translatedLabel')}</p>
              )}
              <p className="mb-2 text-xl font-semibold leading-snug text-fg">
                <HighlightedText
                  text={(showTranslation && current.titleTranslated) || current.title || t('common.untitled')}
                  termSets={termSets}
                  enabled={hlOn}
                />
              </p>
              <div className="mb-4 text-sm italic text-mut">{current.authors}</div>
              {current.abstract ? (
                <div className="whitespace-pre-wrap text-[15px] text-fg">
                  <HighlightedText
                    text={(showTranslation && current.abstractTranslated) || current.abstract}
                    termSets={termSets}
                    enabled={hlOn}
                  />
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
                      'flex-1 border-2 py-3 text-[15px] font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-include',
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
                <div className="mt-3 border border-red-200 bg-red-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-red-800">{t('screening.reasonsLabel')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(exclusionReasons.data ?? []).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={reasonsDraft.includes(r.code)}
                        onClick={() => toggleReason(r.code)}
                        className={clsx(
                          'border px-2.5 py-1 text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-include',
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
                className="mt-3 min-h-12 w-full border border-line px-3 py-2 text-sm"
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

              {showUnlockCta && (
                <div className="mt-4 border border-include p-4 text-center">
                  <p className="mb-2 text-sm font-semibold text-include">{t('stageLock.reviewerDoneTitle')}</p>
                  {isOwner ? (
                    <Button onClick={() => unlock(project, nextStage!)} disabled={unlocking}>
                      {t('stageLock.unlockNextCta')}
                    </Button>
                  ) : (
                    <p className="text-xs text-mut">{t('stageLock.waitingForOwner')}</p>
                  )}
                </div>
              )}

              {summary.data && (
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px]">
                  <span className="border border-line bg-[#e7f1f4] px-2 py-0.5 font-semibold text-include">
                    {t('screening.include')} {summary.data.include}
                  </span>
                  <span className="border border-line bg-[#fbefdc] px-2 py-0.5 font-semibold text-uncertain">
                    {t('screening.uncertain')} {summary.data.uncertain}
                  </span>
                  <span className="border border-line bg-[#eef1f3] px-2 py-0.5 font-semibold text-mut">
                    {t('screening.exclude')} {summary.data.exclude}
                  </span>
                  <span className="border border-line px-2 py-0.5 font-semibold text-red-700">
                    {t('screening.filterUndecided')} {summary.data.undecided}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="h-fit border border-line bg-white p-4 text-[12.5px]">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mut">PICOTS</h2>
          <div className="mb-3">
            <button
              type="button"
              className="mb-1 flex w-full cursor-pointer items-center justify-between font-bold text-include"
              onClick={() => setShowInclusionCriteria((v) => !v)}
              aria-expanded={showInclusionCriteria}
            >
              {t('criteria.inclusion')}
              <span className="text-xs">{showInclusionCriteria ? '▾' : '▸'}</span>
            </button>
            {showInclusionCriteria && (
              <ul className="ml-4 list-disc space-y-0.5 text-mut">
                {inclusionCriteria.map((c) => (
                  <li key={c.id}>{c.text}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <button
              type="button"
              className="mb-1 flex w-full cursor-pointer items-center justify-between font-bold text-red-700"
              onClick={() => setShowExclusionCriteria((v) => !v)}
              aria-expanded={showExclusionCriteria}
            >
              {t('criteria.exclusion')}
              <span className="text-xs">{showExclusionCriteria ? '▾' : '▸'}</span>
            </button>
            {showExclusionCriteria && (
              <ul className="ml-4 list-disc space-y-0.5 text-mut">
                {exclusionCriteria.map((c) => (
                  <li key={c.id}>{c.text}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
    </StageGate>
  )
}
