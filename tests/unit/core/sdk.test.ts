import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the SDK by importing it and mocking fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Zenith SDK Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export createClient factory', async () => {
    const { createClient } = await import('../../../packages/sdk/src/index')
    const client = createClient({ url: 'http://localhost:3000' })
    expect(client).toBeDefined()
    expect(typeof client.find).toBe('function')
    expect(typeof client.findById).toBe('function')
    expect(typeof client.create).toBe('function')
    expect(typeof client.update).toBe('function')
    expect(typeof client.delete).toBe('function')
    expect(typeof client.count).toBe('function')
    expect(typeof client.aggregate).toBe('function')
    expect(typeof client.batch).toBe('function')
    expect(typeof client.upload).toBe('function')
    expect(typeof client.uploadMany).toBe('function')
    expect(typeof client.flushCache).toBe('function')
    expect(typeof client.invalidateCache).toBe('function')
  })

  it('should build query strings correctly', async () => {
    const { ZenithClient } = await import('../../../packages/sdk/src/index')
    const client = new ZenithClient({ url: 'http://localhost:3000', cacheTtl: 0 })

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [], totalDocs: 0, totalPages: 1, page: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await client.find('posts', { limit: 10, page: 2, sort: '-createdAt' })

    const callUrl = mockFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('limit=10')
    expect(callUrl).toContain('page=2')
    expect(callUrl).toContain('sort=-createdAt')
  })

  it('should include auth headers when apiKey is provided', async () => {
    const { ZenithClient } = await import('../../../packages/sdk/src/index')
    const client = new ZenithClient({
      url: 'http://localhost:3000',
      apiKey: 'test-key',
      siteId: 'site-1',
      cacheTtl: 0,
    })

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { document: { id: '1', title: 'Test' } } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await client.findById('posts', '1')

    const callHeaders = mockFetch.mock.calls[0][1]?.headers as Headers
    expect(callHeaders.get('Authorization')).toBe('Bearer test-key')
    expect(callHeaders.get('X-Zenith-Site-Id')).toBe('site-1')
  })

  it('should throw on non-ok responses', async () => {
    const { ZenithClient } = await import('../../../packages/sdk/src/index')
    const client = new ZenithClient({ url: 'http://localhost:3000', cacheTtl: 0 })

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(client.find('posts')).rejects.toThrow('Not found')
  })

  it('should batch multiple requests', async () => {
    const { ZenithClient } = await import('../../../packages/sdk/src/index')
    const client = new ZenithClient({ url: 'http://localhost:3000', cacheTtl: 0 })

    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: '1' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: '2' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const results = await client.batch([
      { method: 'GET', path: '/api/v1/posts' },
      { method: 'GET', path: '/api/v1/authors' },
    ])

    expect(results).toHaveLength(2)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should upload files as FormData', async () => {
    const { ZenithClient } = await import('../../../packages/sdk/src/index')
    const client = new ZenithClient({ url: 'http://localhost:3000', cacheTtl: 0 })

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: 'media-1', url: 'http://cdn.test/img.jpg' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const result = await client.upload(file, { alt: 'Test image' })

    expect(result.id).toBe('media-1')
    const callBody = mockFetch.mock.calls[0][1]?.body as FormData
    expect(callBody).toBeInstanceOf(FormData)
    const uploadedFile = callBody.get('file') as File
    expect(uploadedFile).toBeDefined()
    expect(uploadedFile.name).toBe('test.jpg')
    expect(uploadedFile.type).toBe('image/jpeg')
    expect(uploadedFile.size).toBe(4)
    expect(callBody.get('alt')).toBe('Test image')
  })

  it('should cache GET requests and serve stale on subsequent calls', async () => {
    const { ZenithClient } = await import('../../../packages/sdk/src/index')
    const client = new ZenithClient({ url: 'http://localhost:3000', cacheTtl: 5000 })

    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: [{ id: '1', title: 'Cached' }], totalDocs: 1, totalPages: 1, page: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )

    // First call hits the network
    const result1 = await client.find('posts', { limit: 10 })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second call should use cache (within TTL)
    const result2 = await client.find('posts', { limit: 10 })
    // fetch is still 1 because second call served from cache
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result2.docs).toEqual(result1.docs)

    // Flush cache and try again
    client.flushCache()
    const result3 = await client.find('posts', { limit: 10 })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
