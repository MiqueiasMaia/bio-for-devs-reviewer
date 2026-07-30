import { useEffect, useRef } from 'react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { IconButton } from '@/components/ui/IconButton'
import { SearchIcon, TrashIcon, UploadIcon } from '@/components/ui/icons'
import { useFulltextDocs, useFulltextMutations } from './hooks'
import { getSignedPdfUrl } from './api'

export function FulltextPanel({
  recordId,
  projectId,
  doi,
  unpaywallCheckedAt,
  onAutoCheckSettled,
}: {
  recordId: string
  projectId: string
  doi?: string | null
  /** Null means the automatic Unpaywall lookup hasn't run yet for this
   * record (see migration 0028) — drives the auto-fetch effect below. */
  unpaywallCheckedAt?: string | null
  /** Lets the parent refresh its own queue cache once the check lands, so
   * `unpaywallCheckedAt` stops reading stale null after a page reload. */
  onAutoCheckSettled?: () => void
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: docs } = useFulltextDocs(recordId)
  const mutations = useFulltextMutations(recordId, projectId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoTriedForRecord = useRef<string | null>(null)

  // Tries the Unpaywall lookup on its own, before asking for a manual
  // upload — the button below becomes a retry action, not the only way in.
  // Guarded by `unpaywallCheckedAt` (persisted server-side) so a record
  // that was already checked, found nothing, doesn't get re-queried on
  // every visit, and by the ref so it only fires once per record per
  // mount even before that timestamp round-trips back through the queue.
  useEffect(() => {
    if (!doi || unpaywallCheckedAt || !docs || docs.length > 0) return
    if (autoTriedForRecord.current === recordId) return
    autoTriedForRecord.current = recordId
    mutations.fetchOpenAccess.mutate(doi, { onSettled: () => onAutoCheckSettled?.() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, doi, unpaywallCheckedAt, docs])

  async function handleView(storagePath: string) {
    const url = await getSignedPdfUrl(storagePath)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const alreadyChecked = Boolean(unpaywallCheckedAt) || mutations.fetchOpenAccess.isSuccess
  const showPersistedNotFound =
    Boolean(unpaywallCheckedAt) &&
    !mutations.fetchOpenAccess.isSuccess &&
    !mutations.fetchOpenAccess.isError &&
    (docs?.length ?? 0) === 0

  return (
    <div className="border border-line bg-bg p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-mut">{t('fulltext.title')}</h3>
        <div className="flex items-center gap-2">
          {doi && (
            <IconButton
              icon={<SearchIcon />}
              label={
                mutations.fetchOpenAccess.isPending
                  ? t('fulltext.searching')
                  : alreadyChecked
                    ? t('fulltext.searchAgain')
                    : t('fulltext.searchOpenAccess')
              }
              onClick={() => mutations.fetchOpenAccess.mutate(doi, { onSettled: () => onAutoCheckSettled?.() })}
              disabled={mutations.fetchOpenAccess.isPending}
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file && user) mutations.upload.mutate({ file, uploadedBy: user.id })
              e.target.value = ''
            }}
          />
          <IconButton
            icon={<UploadIcon />}
            label={mutations.upload.isPending ? t('fulltext.uploading') : t('fulltext.upload')}
            onClick={() => fileInputRef.current?.click()}
            disabled={mutations.upload.isPending}
          />
        </div>
      </div>
      {mutations.fetchOpenAccess.isSuccess && !mutations.fetchOpenAccess.data.attached && (
        <p className="mb-2 text-xs text-uncertain">{t('fulltext.oaNotFound')}</p>
      )}
      {mutations.fetchOpenAccess.isSuccess && mutations.fetchOpenAccess.data.attached && (
        <p className="mb-2 text-xs text-include">{t('fulltext.oaAttached')}</p>
      )}
      {mutations.fetchOpenAccess.isError && <p className="mb-2 text-xs text-red-600">{t('fulltext.oaError')}</p>}
      {showPersistedNotFound && <p className="mb-2 text-xs text-uncertain">{t('fulltext.oaCheckedAutomatically')}</p>}
      {(!docs || docs.length === 0) && <p className="text-xs text-mut">{t('fulltext.empty')}</p>}
      <ul className="flex flex-col gap-1">
        {docs?.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between text-sm">
            <button onClick={() => handleView(doc.storagePath)} className="cursor-pointer text-include underline">
              {doc.storagePath.split('/').pop()}
            </button>
            <IconButton
              icon={<TrashIcon />}
              label={t('common.delete')}
              variant="ghost"
              onClick={() => mutations.remove.mutate(doc)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
