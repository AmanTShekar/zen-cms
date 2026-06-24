/**
 * Lightweight CSV util — no external dependencies.
 * Handles standard RFC-4180 CSV (quoted fields, escaped quotes, newlines inside quotes).
 */

/**
 * Parse a CSV string into an array of objects (using the first row as headers).
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"'
          i += 2
        } else {
          // End of quoted field
          inQuotes = false;
          i++
        }
      } else {
        currentField += char
        i++
      }
    } else {
      if (char === '"') {
        if (currentField === '') {
          // Start of quoted field
          inQuotes = true
          i++
        } else if (nextChar === '"') {
          // Escaped quote inside unquoted field
          currentField += '"'
          i += 2
        } else {
          // Double quote character
          currentField += '"'
          i++
        }
      } else if (char === ',') {
        currentRow.push(currentField)
        currentField = ''
        i++
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField)
        currentField = ''
        rows.push(currentRow)
        currentRow = []
        i += 2
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField)
        currentField = ''
        rows.push(currentRow)
        currentRow = []
        i++
      } else {
        currentField += char
        i++
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  // Filter out any completely empty rows
  const cleanRows = rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ''))

  if (cleanRows.length === 0) return []

  const headers = cleanRows[0]
  const result: Record<string, string>[] = []

  for (let r = 1; r < cleanRows.length; r++) {
    const values = cleanRows[r]
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? ''
    })
    result.push(obj)
  }

  return result
}

/**
 * Serialize an array of objects to a CSV string.
 * Escapes values that contain commas, quotes, or newlines.
 */
export function stringifyCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines: string[] = [headers.map(escapeCsvField).join(',')]

  for (const row of rows) {
    const values = headers.map((h) => escapeCsvField(row[h] ?? ''))
    lines.push(values.join(','))
  }

  return lines.join('\r\n')
}

function escapeCsvField(value: any): string {
  const str = value === undefined || value === null ? '' : String(value)
  // If the field contains comma, quote, or newline, wrap in quotes and double internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}