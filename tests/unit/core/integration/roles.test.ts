import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { AuthService } from '../../../../packages/core/src/services/auth'

describe('Roles Router Integration', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  let adminToken: string
  let testSiteId: string
  let testRoleId: string

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'roles-tester@test.com', password: 'abc', role: 'admin' })
      const testUserId = user.id || user._id.toString()
      const ws = await adapter.create('z_workspaces', { slug: 'roles-ws', name: 'Roles WS', ownerId: testUserId })
      const site = await adapter.create('z_sites', { slug: 'roles-site', name: 'Roles Site', workspaceId: ws.id || ws._id.toString(), ownerId: testUserId })
      testSiteId = site.id || site._id.toString()

      adminToken = AuthService.generateToken({
        id: testUserId,
        email: 'roles-tester@test.com',
        role: 'admin',
        siteId: testSiteId
      })
    } catch (e) {}
  })

  afterAll(async () => {
    await zenith.stop()
  })

  it('Creates a new custom role', async () => {
    const res = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        roleName: 'CustomRole',
        description: 'Test Custom Role',
        permissions: [
          { resource: 'posts', actions: ['read', 'create'] }
        ]
      })
    
    expect(res.status).toBe(201)
    expect(res.body.data.roleName).toBe('CustomRole')
    testRoleId = res.body.data.id || res.body.data._id
  })

  it('Lists all roles', async () => {
    const res = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Updates a role', async () => {
    const res = await request(app)
      .patch(`/api/v1/roles/${testRoleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        permissions: [
          { resource: 'posts', actions: ['read', 'create', 'update', 'delete'] }
        ]
      })
    
    expect(res.status).toBe(200)
    expect(res.body.data.permissions[0].actions).toContain('delete')
  })

  it('Deletes a role', async () => {
    const res = await request(app)
      .delete(`/api/v1/roles/${testRoleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect(res.status).toBe(200)
  })
})
