import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContentService } from '../src/services/content'
import { CollectionConfig } from '@zenithcms/types'
import { DatabaseAdapter } from '../src/database/adapters/BaseAdapter'

// Mock DatabaseAdapter
const mockAdapter: any = {
  name: 'mock-adapter',
  connect: vi.fn(),
  disconnect: vi.fn(),
  getHealth: vi.fn().mockReturnValue('ok'),
  registerCollection: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
  transaction: vi.fn((fn: any) => fn(null)),
  createAuditLog: vi.fn(),
  createVersion: vi.fn(),
  getVersions: vi.fn(),
}

const mockConfig: CollectionConfig = {
  name: 'Posts',
  slug: 'posts',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'richtext' },
  ],
  versions: true,
  timestamps: true,
}

describe('Zenith ContentService - Engine Validation', () => {
  let service: ContentService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ContentService(mockConfig, mockAdapter)
  })

  it('should apply field hooks recursively', async () => {
    const mockDoc = {
      title: 'Hello',
    }

    // We expect the recursive processing logic to work cleanly
    const result = await (service as any).processFields(mockDoc, { locale: 'en' }, 'afterRead')
    expect(result.title).toBe('Hello')
  })

  it('should find documents with RLS filters', async () => {
    mockAdapter.find.mockResolvedValue([{ title: 'Test Post' }])

    const user = { id: 'user1', role: 'editor' }
    const docs = await service.find({}, { user })

    expect(mockAdapter.find).toHaveBeenCalled()
    expect(docs[0].title).toBe('Test Post')
  })

  it('should calculate delta on update', async () => {
    const oldDoc = { id: '1', title: 'Old Title', content: 'Old Content' }
    const newData = { title: 'New Title' }

    mockAdapter.findOne.mockResolvedValue(oldDoc)
    mockAdapter.update.mockResolvedValue({ ...oldDoc, ...newData })

    const { delta } = await service.update('1', newData, { user: { id: 'admin' } })

    expect(delta.title).toEqual({ from: 'Old Title', to: 'New Title' })
    expect(delta.content).toBeUndefined() // Content didn't change
  })

  it('should apply RLS on findById', async () => {
    const configWithRLS: CollectionConfig = {
      ...mockConfig,
      access: {
        read: (user) => {
          if (user.role === 'admin') return true
          return { ownerId: user.id }
        }
      }
    }
    const rlsService = new ContentService(configWithRLS, mockAdapter)
    mockAdapter.findOne.mockResolvedValue({ id: '1', title: 'Post 1', ownerId: 'user1' })

    const user = { id: 'user1', role: 'editor' }
    await rlsService.findById('1', { user })

    expect(mockAdapter.findOne).toHaveBeenCalledWith(
      'posts',
      expect.objectContaining({ _id: '1', ownerId: 'user1' }),
      expect.any(Object)
    )
  })

  it('should block updates if RLS access returns false', async () => {
    const configWithRLS: CollectionConfig = {
      ...mockConfig,
      access: {
        update: (user) => user.role === 'admin'
      }
    }
    const rlsService = new ContentService(configWithRLS, mockAdapter)

    const user = { id: 'user1', role: 'editor' }
    await expect(rlsService.update('1', { title: 'New' }, { user })).rejects.toThrow()
  })

  it('should enforce RLS query constraints on delete', async () => {
    const configWithRLS: CollectionConfig = {
      ...mockConfig,
      access: {
        delete: (user) => ({ ownerId: user.id })
      }
    }
    const rlsService = new ContentService(configWithRLS, mockAdapter)
    mockAdapter.findOne.mockResolvedValue({ _id: '1', ownerId: 'user1' })
    mockAdapter.delete.mockResolvedValue(true)

    const user = { id: 'user1', role: 'editor' }
    await rlsService.delete('1', { user })

    expect(mockAdapter.findOne).toHaveBeenCalledWith(
      'posts',
      expect.objectContaining({ _id: '1', ownerId: 'user1' }),
      expect.any(Object)
    )
    expect(mockAdapter.delete).toHaveBeenCalledWith('posts', '1', expect.any(Object))
  })
})
