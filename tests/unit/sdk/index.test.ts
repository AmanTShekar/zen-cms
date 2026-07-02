import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZenithClient } from '../../../packages/sdk/src/index'

// Minimal fetch mock — intercepts calls and returns JSON
function makeClient() {
  return new ZenithClient({ url: 'http://localhost:3000' })
}

beforeEach(() => {
  global.fetch = vi.fn()
})

describe('ZenithClient — SWR cache', () => {
  it('serves stale data immediately and revalidates in background', async () => {
    const client = makeClient()
    const mockData = { data: { docs: [{ _id: '1', title: 'Cached Post' }] } }

    // First request — pre-populate cache with stale data
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const result1 = await client.find('posts', { limit: 5, cacheTtl: 30_000 })
    expect(result1.docs[0].title).toBe('Cached Post')

    // Second request should return cached data immediately without waiting
    const start = Date.now()
    const result2 = await client.find('posts', { limit: 5 })
    const elapsed = Date.now() - start
    // With cache hit and SWR revalidation, this should be near-instant
    expect(elapsed).toBeLessThan(50)
    expect(result2.docs[0].title).toBe('Cached Post')
  })

  it('bypasses cache when cacheTtl is 0', async () => {
    const client = makeClient()
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { docs: [] } }),
    })

    // Should call fetch both times
    await client.find('posts', { cacheTtl: 0 })
    await client.find('posts', { cacheTtl: 0 })

    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})

describe('ZenithClient — batch', () => {
  it('executes multiple requests in parallel', async () => {
    const client = makeClient()
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { posts: [] } }),
    })

    await client.batch([
      { method: 'GET', path: '/api/v1/posts' },
      { method: 'GET', path: '/api/v1/authors' },
    ])

    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2)
  })
})

describe('ZenithClient — upload', () => {
  it('sends FormData for file uploads and omits Content-Type header', async () => {
    const client = makeClient()
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { _id: '123', url: 'http://cdn/img.jpg' } }),
    })

    const file = new File(['hello'], 'test.jpg', { type: 'image/jpeg' })
    await client.upload(file, { alt: 'Test alt', focalPoint: { x: 50, y: 50 } })

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain('/api/v1/upload')
    expect(options.headers.get('Content-Type')).toBeNull() // fetch auto-sets multipart
    expect(options.method).toBe('POST')
  })
})

describe('ZenithClient — site switching', () => {
  it('updates siteId and flushes cache when setSiteId is called', async () => {
    const client = makeClient()
    const mockData1 = { data: { docs: [{ _id: '1', title: 'Post Site A' }] } }
    const mockData2 = { data: { docs: [{ _id: '2', title: 'Post Site B' }] } }

    ;(fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData2),
      })

    // Fetch on default site ID (empty)
    const res1 = await client.find('posts', { limit: 5 })
    expect(res1.docs[0].title).toBe('Post Site A')

    // Change site ID using setSiteId
    client.setSiteId('site-b')

    // Fetch again — cache should be flushed, performing a new fetch with headers
    const res2 = await client.find('posts', { limit: 5 })
    expect(res2.docs[0].title).toBe('Post Site B')

    // Verify correct header was sent in the second request
    const lastCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(lastCall[1].headers.get('X-Zenith-Site-Id')).toBe('site-b')
  })
})
