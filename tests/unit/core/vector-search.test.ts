import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { VectorSearchService } from '../../../packages/core/src/services/vector-search'

// Mock the AdapterFactory to avoid real DB connections
vi.mock('../../../packages/core/src/database/adapters/AdapterFactory', () => ({
  AdapterFactory: {
    getActiveAdapter: () => ({
      name: 'mock',
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'vec-1' }),
      deleteMany: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

describe('VectorSearchService', () => {
  beforeEach(() => {
    vi.spyOn(VectorSearchService as any, 'generateEmbedding').mockResolvedValue([0.1, 0.2, 0.3])
  })

  describe('cosineSimilarity (via search behavior)', () => {
    it('should return empty results when no vectors exist', async () => {
      const results = await VectorSearchService.search('hello world', ['posts'], 10)
      expect(results).toEqual([])
    })

    it('should return empty results for empty query collections', async () => {
      const results = await VectorSearchService.search('test', [], 10)
      expect(results).toEqual([])
    })
  })

  describe('isAvailable', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('should return true when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      expect(VectorSearchService.isAvailable()).toBe(true)
      delete process.env.OPENAI_API_KEY
    })

    it('should return true when OPENROUTER_API_KEY is set', () => {
      process.env.OPENROUTER_API_KEY = 'or-test'
      expect(VectorSearchService.isAvailable()).toBe(true)
      delete process.env.OPENROUTER_API_KEY
    })

    it('should return false when no embedding keys are set', () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.OPENROUTER_API_KEY
      expect(VectorSearchService.isAvailable()).toBe(false)
    })
  })

  describe('indexDocument', () => {
    it('should skip indexing for empty or very short text', async () => {
      // Should not throw, just return early
      await VectorSearchService.indexDocument('posts', 'doc-1', 'title', '')
      await VectorSearchService.indexDocument('posts', 'doc-1', 'title', 'a')
      // No error = pass
    })
  })

  describe('removeDocument', () => {
    it('should not throw when removing a non-existent document', async () => {
      await VectorSearchService.removeDocument('posts', 'non-existent-id')
      // No error = pass
    })
  })
})
