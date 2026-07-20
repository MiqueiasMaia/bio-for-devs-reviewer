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
