export interface ReferenceRecord {
  humanRef: string
  title: string
  authors: string
  year: number | null
  journal: string | null
  doi: string | null
}

function splitAuthors(authors: string): string[] {
  return authors
    .split(/[;]/)
    .map((a) => a.trim())
    .filter(Boolean)
}

/** Builds a RIS export (one TY..ER record per reference). */
export function buildRis(records: ReferenceRecord[]): string {
  const blocks = records.map((r) => {
    const lines = ['TY  - JOUR']
    for (const author of splitAuthors(r.authors)) lines.push(`AU  - ${author}`)
    lines.push(`TI  - ${r.title}`)
    if (r.year) lines.push(`PY  - ${r.year}`)
    if (r.journal) lines.push(`JO  - ${r.journal}`)
    if (r.doi) lines.push(`DO  - ${r.doi}`)
    lines.push(`ID  - ${r.humanRef}`)
    lines.push('ER  - ')
    return lines.join('\n')
  })
  return blocks.join('\n\n')
}

function bibtexKey(r: ReferenceRecord): string {
  const firstAuthor = splitAuthors(r.authors)[0]?.split(',')[0]?.replace(/[^A-Za-z]/g, '') ?? 'ref'
  return `${firstAuthor}${r.year ?? ''}${r.humanRef}`
}

function bibtexEscape(value: string): string {
  return value.replace(/[{}]/g, '')
}

/** Builds a BibTeX export (one @article entry per reference). */
export function buildBibtex(records: ReferenceRecord[]): string {
  return records
    .map((r) => {
      const fields: string[] = []
      const authors = splitAuthors(r.authors)
      if (authors.length > 0) fields.push(`  author = {${bibtexEscape(authors.join(' and '))}}`)
      fields.push(`  title = {${bibtexEscape(r.title)}}`)
      if (r.year) fields.push(`  year = {${r.year}}`)
      if (r.journal) fields.push(`  journal = {${bibtexEscape(r.journal)}}`)
      if (r.doi) fields.push(`  doi = {${r.doi}}`)
      return `@article{${bibtexKey(r)},\n${fields.join(',\n')}\n}`
    })
    .join('\n\n')
}
