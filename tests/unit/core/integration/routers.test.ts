import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import request from 'supertest'
import jwt from 'jsonwebtoken'

describe('API Routers Integration', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  
  let adminToken: string
  let testUserId: string
  let testSiteId: string

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'router-test@test.com' })
      testUserId = user.id || user._id.toString()
      
      const ws = await adapter.create('z_workspaces', { slug: 'router-workspace', name: 'Router Workspace', ownerId: testUserId })
      const wsId = ws.id || ws._id.toString()
      
      const site = await adapter.create('z_sites', { slug: 'router-site', name: 'Router Site', workspaceId: wsId, ownerId: testUserId })
      testSiteId = site.id || site._id.toString()
      
      adminToken = jwt.sign({ id: testUserId, role: 'admin' }, process.env.JWT_SECRET || 'mock_jwt_secret_must_be_at_least_32_characters_long', { expiresIn: '1h' })
    } catch (err: any) {
      console.error('Seed cascade data err:', err.message)
    }
  })

  afterAll(async () => {
    await zenith.stop()
  })

  // Testing Blocks Router
  it('Blocks Router: Read operations', async () => {
    // GET Blocks catalog
    const res = await request(app)
      .get('/api/v1/blocks')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})
