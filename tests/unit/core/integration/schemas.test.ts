import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { AuthService } from '../../../../packages/core/src/services/auth'

describe('Schemas Router Integration', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  let adminToken: string
  let testSiteId: string
  let schemaId: string

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'schemas-tester@test.com', password: 'abc', role: 'admin' })
      const testUserId = user.id || user._id.toString()
      const ws = await adapter.create('z_workspaces', { slug: 'schemas-ws', name: 'Schemas WS', ownerId: testUserId })
      const site = await adapter.create('z_sites', { slug: 'schemas-site', name: 'Schemas Site', workspaceId: ws.id || ws._id.toString(), ownerId: testUserId })
      testSiteId = site.id || site._id.toString()

      adminToken = AuthService.generateToken({
        id: testUserId,
        email: 'schemas-tester@test.com',
        role: 'admin',
        siteId: testSiteId
      })
    } catch (e) {}
  })

  afterAll(async () => {
    await zenith.stop()
  })

  it('Creates a new collection schema', async () => {
    const res = await request(app)
      .post('/api/v1/schemas')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        name: 'Articles',
        slug: 'articles',
        singular: 'Article',
        plural: 'Articles',
        type: 'collection',
        fields: [
          { name: 'title', type: 'text', required: true }
        ]
      })
    
    if (res.status !== 201) console.log('SCHEMAS CREATE ERROR:', res.body)
    expect(res.status).toBe(201)
    expect(res.body.data.slug).toBe('articles')
    expect(res.body.data.name).toBe('articles')
    schemaId = res.body.data.id || res.body.data._id
  })

  it('Fails to create a schema with duplicate slug', async () => {
    const res = await request(app)
      .post('/api/v1/schemas')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        name: 'Duplicate Articles',
        slug: 'articles',
        singular: 'Duplicate Article',
        plural: 'Duplicate Articles',
        type: 'collection',
        fields: []
      })
    
    expect(res.status).toBe(400) // InvalidPayloadError
  })

  it('Lists all schemas', async () => {
    const res = await request(app)
      .get('/api/v1/schemas')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    if (res.status !== 200) console.log('VERSIONS LIST ERROR:', res.body)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Updates a schema', async () => {
    const res = await request(app)
      .put(`/api/v1/schemas/${schemaId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        plural: 'Updated Articles'
      })
    
    expect(res.status).toBe(200)
  })

  it('Deletes a schema', async () => {
    const res = await request(app)
      .delete(`/api/v1/schemas/${schemaId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect(res.status).toBe(200)
  })
})
