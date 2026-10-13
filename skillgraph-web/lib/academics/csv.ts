/**
 * Minimal RFC 4180 CSV reader for faculty imports — quoted fields, escaped quotes ("")
 * and newlines inside quotes. Exports from Excel, Google Sheets and ERP systems all fit.
 */

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024
export const MAX_IMPORT_ROWS = 5000

export class CsvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsvError'
  }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"' && field === '') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      if (rows.length > MAX_IMPORT_ROWS + 1) throw new CsvError(`Files are limited to ${MAX_IMPORT_ROWS} rows.`)
    } else {
      field += ch
    }
  }
  if (quoted) throw new CsvError('A quoted field is never closed.')
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

export const normaliseHeader = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, '_')

export type CsvRecord = { line: number; values: Record<string, string>; raw: Record<string, string> }

/** Rows as header → value maps. `values` uses normalised headers; `raw` keeps the originals. */
export function csvRecords(text: string): { headers: string[]; records: CsvRecord[] } {
  if (text.length > MAX_IMPORT_BYTES) throw new CsvError('Files are limited to 2 MB.')
  const rows = parseCsv(text)
  if (rows.length < 2) throw new CsvError('The file needs a header row and at least one data row.')
  const original = rows[0].map(h => h.trim())
  const headers = original.map(normaliseHeader)
  const records = rows.slice(1).map((cells, i) => {
    const values: Record<string, string> = {}
    const raw: Record<string, string> = {}
    headers.forEach((h, j) => {
      values[h] = (cells[j] ?? '').trim()
      raw[original[j]] = (cells[j] ?? '').trim()
    })
    return { line: i + 2, values, raw }
  })
  return { headers, records }
}
