import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { AuthService } from '../../../../packages/core/src/services/auth'

describe('Redirects Router Integration', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  let adminToken: string
  let testSiteId: string
  let redirectId: string

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'redirects-tester@test.com', password: 'abc', role: 'admin' })
      const testUserId = user.id || user._id.toString()
      const ws = await adapter.create('z_workspaces', { slug: 'redirects-ws', name: 'Redirects WS', ownerId: testUserId })
      const site = await adapter.create('z_sites', { slug: 'redirects-site', name: 'Redirects Site', workspaceId: ws.id || ws._id.toString(), ownerId: testUserId })
      testSiteId = site.id || site._id.toString()

      adminToken = AuthService.generateToken({
        id: testUserId,
        email: 'redirects-tester@test.com',
        role: 'admin',
        siteId: testSiteId
      })
    } catch (e) {}
  })

  afterAll(async () => {
    await zenith.stop()
  })

  it('Creates a new redirect', async () => {
    const res = await request(app)
      .post('/api/v1/redirects')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        from: '/old-path',
        to: '/new-path',
        type: '301'
      })
    
    expect(res.status).toBe(201)
    expect(res.body.data.from).toBe('/old-path')
    expect(res.body.data.to).toBe('/new-path')
    redirectId = res.body.data.id || res.body.data._id
  })

  it('Fails to create duplicate redirect', async () => {
    const res = await request(app)
      .post('/api/v1/redirects')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        from: '/old-path',
        to: '/different-path',
      })
    
    expect(res.status).toBe(409) // DuplicateError
  })

  it('Lists all redirects', async () => {
    const res = await request(app)
      .get('/api/v1/redirects')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Updates a redirect', async () => {
    const res = await request(app)
      .patch(`/api/v1/redirects/${redirectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        to: '/updated-path'
      })
    
    expect(res.status).toBe(200)
    expect(res.body.data.to).toBe('/updated-path')
  })

  it('Resolves a redirect path', async () => {
    const res = await request(app)
      .post('/api/v1/redirects/lookup')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        path: '/old-path'
      })
    
    expect(res.status).toBe(200)
    expect(res.body.data.to).toBe('/updated-path')
  })

  it('Deletes a redirect', async () => {
    const res = await request(app)
      .delete(`/api/v1/redirects/${redirectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect(res.status).toBe(200)
  })
})
