import { supabase } from '@/lib/supabase'

const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get'
// MyMemory's free tier caps requests at roughly 500 characters — abstracts
// routinely exceed that, so long text is split into sentence-sized chunks
// (well under the cap) and translated in parallel, then rejoined.
const MAX_CHUNK_LENGTH = 450

function splitIntoChunks(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length > MAX_CHUNK_LENGTH && current) {
      chunks.push(current)
      current = sentence
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)
  // A single sentence longer than the cap still needs to go through as
  // one (best-effort) chunk — MyMemory truncates rather than erroring.
  return chunks.length > 0 ? chunks : [text]
}

async function translateChunk(chunk: string, sourceLang: string, targetLang: string): Promise<string> {
  const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(chunk)}&langpair=${sourceLang}|${targetLang}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MyMemory request failed with status ${res.status}`)
  const body = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number }
  const translated = body.responseData?.translatedText
  if (!translated) throw new Error('MyMemory returned no translation')
  return translated
}

/** Fixed en→pt-BR: MyMemory requires an explicit source language (no
 * reliable auto-detect), and English is by far the dominant language for
 * systematic-review abstracts. A record already in Portuguese may come
 * back oddly translated — acceptable given translation here is a reading
 * aid, not something the review methodology depends on; the original is
 * always one click away. */
export async function translateText(
  text: string,
  sourceLang = 'en',
  targetLang = 'pt-BR',
): Promise<string> {
  const chunks = splitIntoChunks(text)
  const translatedChunks = await Promise.all(chunks.map((c) => translateChunk(c, sourceLang, targetLang)))
  return translatedChunks.join(' ')
}

export interface TranslatedRecord {
  title: string
  abstract: string | null
}

/**
 * Translates a record's title/abstract and caches the result directly on
 * the row (shared across every reviewer on the project — nobody else
 * pays for a re-translation). No server-side function involved: MyMemory
 * has open CORS, and the existing "owner/reviewer can manage records" RLS
 * policy already permits this update.
 */
export async function translateRecord(record: {
  id: string
  title: string
  abstract: string | null
}): Promise<TranslatedRecord> {
  const [title, abstract] = await Promise.all([
    translateText(record.title),
    record.abstract ? translateText(record.abstract) : Promise.resolve(null),
  ])

  const { error } = await supabase
    .from('records')
    .update({ title_translated: title, abstract_translated: abstract, translated_at: new Date().toISOString() })
    .eq('id', record.id)
  if (error) throw error

  return { title, abstract }
}
