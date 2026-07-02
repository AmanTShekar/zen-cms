import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { AuthService } from '../../../../packages/core/src/services/auth'
import fs from 'fs'
import path from 'path'

describe('Media Router Integration', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  let adminToken: string
  let testSiteId: string
  let mediaId: string
  const testImagePath = path.join(__dirname, 'test-image.png')

  beforeAll(async () => {
    // Create a valid 1x1 PNG file to bypass magic byte validation
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    fs.writeFileSync(testImagePath, Buffer.from(pngBase64, 'base64'))

    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'media-tester@test.com', password: 'abc', role: 'admin' })
      const testUserId = user.id || user._id.toString()
      const ws = await adapter.create('z_workspaces', { slug: 'media-ws', name: 'Media WS', ownerId: testUserId })
      const site = await adapter.create('z_sites', { slug: 'media-site', name: 'Media Site', workspaceId: ws.id || ws._id.toString(), ownerId: testUserId })
      testSiteId = site.id || site._id.toString()

      adminToken = AuthService.generateToken({
        id: testUserId,
        email: 'media-tester@test.com',
        role: 'admin',
        siteId: testSiteId
      })
    } catch (e) {}
  })

  afterAll(async () => {
    await zenith.stop()
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath)
    }
  })

  it('Creates a media record via hotlink URL', async () => {
    const res = await request(app)
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        url: 'https://example.com/test.jpg',
        alt: 'Test Alt'
      })
    
    expect(res.status).toBe(200)
    expect(res.body.data.url).toBe('https://example.com/test.jpg')
    mediaId = res.body.data.id || res.body.data._id
  })

  it('Fails upload with invalid mime type', async () => {
    const res = await request(app)
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' })
    
    expect(res.status).toBe(400) // InvalidPayloadError
  })

  it('Fails upload with mismatched magic bytes', async () => {
    const res = await request(app)
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .attach('file', Buffer.from('not an image'), { filename: 'fake.png', contentType: 'image/png' })
    
    expect(res.status).toBe(400) // InvalidPayloadError: magic bytes don't match
  })

  it('Uploads a genuine file and converts to WebP', async () => {
    const res = await request(app)
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .attach('file', testImagePath, { contentType: 'image/png' })
    
    expect(res.status).toBe(200)
    expect(res.body.data.mimetype).toBe('image/webp') // Sharp pipeline kicks in
    expect(res.body.data.url).toBeDefined()
  })

  it('Lists all media records', async () => {
    const res = await request(app)
      .get('/api/v1/media')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Updates media focal point', async () => {
    const res = await request(app)
      .patch(`/api/v1/media/${mediaId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        focalPoint: { x: 50, y: 50 }
      })
    
    expect(res.status).toBe(200)
    expect(res.body.data.focalPoint.x).toBe(50)
  })
})
