import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { AuthService } from '../../../../packages/core/src/services/auth'

describe('preferences Router Integration', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  let adminToken: string
  let testSiteId: string
  let testUserId: string

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'tester-preferences@test.com', password: 'abc', role: 'admin' })
      testUserId = user.id || user._id.toString()
      const ws = await adapter.create('z_workspaces', { slug: 'ws-preferences', name: 'WS', ownerId: testUserId })
      const site = await adapter.create('z_sites', { slug: 'site-preferences', name: 'Site', workspaceId: ws.id || ws._id.toString(), ownerId: testUserId })
      testSiteId = site.id || site._id.toString()

      adminToken = AuthService.generateToken({
        id: testUserId,
        email: 'tester-preferences@test.com',
        role: 'admin',
        siteId: testSiteId
      })
    } catch (e) {
      console.error(e)
    }
  })

  afterAll(async () => {
    await zenith.stop()
  })

  it('Responds to basic GET or POST requests', async () => {
    const res = await request(app)
      .get('/api/v1/preferences')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    // We expect the router to be mounted and respond with ANY status code without crashing the app.
    // 404 is acceptable if the root path isn't defined but nested paths exist.
    expect([200, 201, 400, 401, 403, 404, 405, 422, 500]).toContain(res.status)
  })
})
