import { useRef } from 'react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/features/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { useFulltextDocs, useFulltextMutations } from './hooks'
import { getSignedPdfUrl } from './api'

export function FulltextPanel({ recordId, projectId }: { recordId: string; projectId: string }) {
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
    <div className="rounded-lg border border-line bg-bg p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-mut">{t('fulltext.title')}</h3>
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
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={mutations.upload.isPending}>
          {mutations.upload.isPending ? t('fulltext.uploading') : t('fulltext.upload')}
        </Button>
      </div>
      {(!docs || docs.length === 0) && <p className="text-xs text-mut">{t('fulltext.empty')}</p>}
      <ul className="flex flex-col gap-1">
        {docs?.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between text-sm">
            <button onClick={() => handleView(doc.storagePath)} className="cursor-pointer text-include underline">
              {doc.storagePath.split('/').pop()}
            </button>
            <Button variant="ghost" aria-label={t('common.delete')} onClick={() => mutations.remove.mutate(doc)}>
              ✕
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
