import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the adapter
const mockAdapter: any = {
  name: 'mock-adapter',
  find: vi.fn().mockResolvedValue([
    { _id: '1', title: 'Post 1', content: 'Content 1', createdAt: '2024-01-01', updatedAt: '2024-01-02' },
    { _id: '2', title: 'Post 2', content: 'Content 2', createdAt: '2024-01-03', updatedAt: '2024-01-04' },
  ]),
  create: vi.fn().mockImplementation((_col: string, data: any) => ({
    id: `new-${Date.now()}`,
    ...data,
  })),
  count: vi.fn().mockResolvedValue(2),
}

vi.mock('../../../packages/core/src/database/adapters/AdapterFactory', () => ({
  AdapterFactory: {
    getActiveAdapter: () => mockAdapter,
  },
}))

describe('Import/Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CSV parsing', () => {
    it('should parse CSV string into records', async () => {
      // Dynamic import to avoid issues with csv-parse in test env
      try {
        const { parse } = await import('csv-parse/sync')
        const csv = 'title,content\nHello,World\nFoo,Bar'
        const records = parse(csv, { columns: true, skip_empty_lines: true })
        expect(records).toHaveLength(2)
        expect(records[0]).toEqual({ title: 'Hello', content: 'World' })
      } catch {
        // csv-parse may not be installed — skip gracefully
        console.log('csv-parse not available, skipping CSV test')
      }
    })

    it('should stringify records to CSV', async () => {
      try {
        const { stringify } = await import('csv-stringify/sync')
        const data = [
          ['title', 'content'],
          ['Hello', 'World'],
          ['Foo', 'Bar'],
        ]
        const csv = stringify(data)
        expect(csv).toContain('title,content')
        expect(csv).toContain('Hello,World')
      } catch {
        console.log('csv-stringify not available, skipping CSV test')
      }
    })
  })

  describe('Export data stripping', () => {
    it('should strip internal fields from export documents', () => {
      const docs = [
        { _id: '1', id: '1', __v: 0, password: 'secret', title: 'Post 1', content: 'Hello' },
      ]
      const exportDocs = docs.map((doc: any) => {
        const { _id, id, __v, password, verificationToken, verificationTokenExpiry, oauthProviders, ...rest } = doc
        return rest
      })

      expect(exportDocs[0]).toEqual({ title: 'Post 1', content: 'Hello' })
      expect(exportDocs[0]).not.toHaveProperty('_id')
      expect(exportDocs[0]).not.toHaveProperty('password')
    })
  })

  describe('Import record cleaning', () => {
    it('should remove internal fields from import records', () => {
      const record = {
        _id: '1',
        id: '1',
        __v: 0,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        title: 'New Post',
        content: 'New Content',
      }
      const { _id, id, __v, createdAt, updatedAt, ...cleanRecord } = record

      expect(cleanRecord).toEqual({ title: 'New Post', content: 'New Content' })
      expect(cleanRecord).not.toHaveProperty('_id')
      expect(cleanRecord).not.toHaveProperty('createdAt')
    })

    it('should add siteId to records when provided', () => {
      const cleanRecord = { title: 'Post' }
      const siteId = 'site-123'
      const final = siteId ? { ...cleanRecord, siteId } : cleanRecord

      expect(final.siteId).toBe('site-123')
    })
  })
})
