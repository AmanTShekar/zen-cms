import { describe, it, expect } from 'vitest'
import { parseCsv, stringifyCsv } from './csv'

describe('stringifyCsv', () => {
  it('returns empty string for empty array', () => {
    expect(stringifyCsv([])).toBe('')
  })

  it('serializes simple rows correctly', () => {
    const rows = [
      { name: 'Alice', role: 'admin' },
      { name: 'Bob', role: 'editor' },
    ]
    const result = stringifyCsv(rows)
    expect(result).toContain('name,role')
    expect(result).toContain('Alice,admin')
    expect(result).toContain('Bob,editor')
  })

  it('escapes fields containing commas', () => {
    const rows = [{ title: 'Hello, World' }]
    const result = stringifyCsv(rows)
    expect(result).toContain('"Hello, World"')
  })

  it('escapes fields containing double quotes', () => {
    const rows = [{ name: 'Say "Hi"' }]
    const result = stringifyCsv(rows)
    expect(result).toContain('"Say ""Hi"""')
  })

  it('escapes fields containing newlines', () => {
    const rows = [{ desc: 'Line1\nLine2' }]
    const result = stringifyCsv(rows)
    expect(result).toContain('"Line1\nLine2"')
  })
})

describe('parseCsv', () => {
  it('returns empty array for empty input', () => {
    expect(parseCsv('')).toEqual([])
    expect(parseCsv('   ')).toEqual([])
  })

  it('parses header row and data rows', () => {
    const csv = 'name,age\nAlice,30\nBob,25'
    const result = parseCsv(csv)
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('handles quoted fields with commas inside', () => {
    const csv = 'title,desc\n"Hello, World",summary'
    const result = parseCsv(csv)
    expect(result).toEqual([
      { title: 'Hello, World', desc: 'summary' },
    ])
  })

  it('handles escaped double quotes inside quoted fields', () => {
    const csv = 'name\nSay ""Hi""'
    const result = parseCsv(csv)
    expect(result).toEqual([{ name: 'Say "Hi"' }])
  })

  it('handles missing trailing values', () => {
    const csv = 'name,role,note\nAlice,admin'
    const result = parseCsv(csv)
    expect(result).toEqual([{ name: 'Alice', role: 'admin', note: '' }])
  })

  it('handles Windows CRLF line endings', () => {
    const csv = 'name\r\nAlice\r\nBob'
    const result = parseCsv(csv)
    expect(result).toMatchObject([{ name: 'Alice' }, { name: 'Bob' }])
  })
})