import { supabase } from '@/lib/supabase'

export interface FulltextDoc {
  id: string
  storagePath: string
  uploadedBy: string
  createdAt: string
}

export async function listFulltextDocs(recordId: string): Promise<FulltextDoc[]> {
  const { data, error } = await supabase
    .from('fulltext_docs')
    .select('id, storage_path, uploaded_by, created_at')
    .eq('record_id', recordId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((d) => ({
    id: d.id,
    storagePath: d.storage_path,
    uploadedBy: d.uploaded_by,
    createdAt: d.created_at,
  }))
}

export async function getSignedPdfUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('fulltext').createSignedUrl(storagePath, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function uploadFulltextPdf(
  projectId: string,
  recordId: string,
  file: File,
  uploadedBy: string,
): Promise<void> {
  const safeName = file.name.replace(/[^A-Za-z0-9_.-]+/g, '_')
  const storagePath = `${projectId}/${recordId}/${Date.now()}-${safeName}`
  const { error: uploadError } = await supabase.storage.from('fulltext').upload(storagePath, file)
  if (uploadError) throw uploadError

  const { error } = await supabase
    .from('fulltext_docs')
    .insert({ record_id: recordId, storage_path: storagePath, uploaded_by: uploadedBy })
  if (error) throw error
}

export async function deleteFulltextDoc(id: string, storagePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from('fulltext').remove([storagePath])
  if (storageError) throw storageError
  const { error } = await supabase.from('fulltext_docs').delete().eq('id', id)
  if (error) throw error
}

export type OpenAccessFetchReason =
  | 'not_found'
  | 'lookup_failed'
  | 'no_oa_pdf'
  | 'download_failed'
  | 'not_a_pdf'

export type OpenAccessFetchResult = { attached: true } | { attached: false; reason: OpenAccessFetchReason }

/** Looks up a legally open-access copy of the PDF via Unpaywall (by DOI) and,
 * if found, downloads and attaches it the same way a manual upload would —
 * server-side, via /api/unpaywall-fetch, since Unpaywall + arbitrary
 * publisher PDF URLs aren't reliably fetchable from the browser. */
export async function fetchOpenAccessPdf(
  projectId: string,
  recordId: string,
  doi: string,
): Promise<OpenAccessFetchResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('No active session')

  const res = await fetch('/api/unpaywall-fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ projectId, recordId, doi }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed with status ${res.status}`)
  }
  return (await res.json()) as OpenAccessFetchResult
}
