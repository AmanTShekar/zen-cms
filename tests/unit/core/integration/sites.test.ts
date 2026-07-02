import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { AuthService } from '../../../../packages/core/src/services/auth'

describe('Sites Router Integration', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  let adminToken: string
  let testWorkspaceId: string
  let testSiteId: string

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'sites-tester@test.com', password: 'abc', role: 'admin' })
      const testUserId = user.id || user._id.toString()
      const ws = await adapter.create('z_workspaces', { slug: 'sites-ws', name: 'Sites WS', ownerId: testUserId })
      testWorkspaceId = ws.id || ws._id.toString()

      adminToken = AuthService.generateToken({
        id: testUserId,
        email: 'sites-tester@test.com',
        role: 'admin',
        siteId: 'global'
      })
    } catch (e) {}
  })

  afterAll(async () => {
    await zenith.stop()
  })

  it('Creates a new site', async () => {
    const res = await request(app)
      .post('/api/v1/sites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Site',
        slug: 'new-site-' + Date.now(),
        workspaceId: testWorkspaceId
      })
    
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('New Site')
    testSiteId = res.body.data.id || res.body.data._id
  })

  it('Lists sites', async () => {
    const res = await request(app)
      .get('/api/v1/sites')
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Fetches a specific site', async () => {
    const res = await request(app)
      .get(`/api/v1/sites/${testSiteId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('New Site')
  })

  it('Updates a site', async () => {
    const res = await request(app)
      .patch(`/api/v1/sites/${testSiteId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Site Name' })
    
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Updated Site Name')
  })
})
