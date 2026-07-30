import { useRef } from 'react'
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
}: {
  recordId: string
  projectId: string
  doi?: string | null
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: docs } = useFulltextDocs(recordId)
  const mutations = useFulltextMutations(recordId, projectId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleView(storagePath: string) {
    const url = await getSignedPdfUrl(storagePath)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="border border-line bg-bg p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-mut">{t('fulltext.title')}</h3>
        <div className="flex items-center gap-2">
          {doi && (
            <IconButton
              icon={<SearchIcon />}
              label={mutations.fetchOpenAccess.isPending ? t('fulltext.searching') : t('fulltext.searchOpenAccess')}
              onClick={() => mutations.fetchOpenAccess.mutate(doi)}
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
