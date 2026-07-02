import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { AuthService } from '../../../../packages/core/src/services/auth'

describe('Trash Router Integration', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  let adminToken: string
  let testSiteId: string
  let trashedDocId: string

  beforeAll(async () => {
    const config = getTestConfig()
    config.collections![0].softDelete = true
    zenith = new Zenith({ config })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'trash-tester@test.com', password: 'abc', role: 'admin' })
      const testUserId = user.id || user._id.toString()
      const ws = await adapter.create('z_workspaces', { slug: 'trash-ws', name: 'Trash WS', ownerId: testUserId })
      const site = await adapter.create('z_sites', { slug: 'trash-site', name: 'Trash Site', workspaceId: ws.id || ws._id.toString(), ownerId: testUserId })
      testSiteId = site.id || site._id.toString()

      adminToken = AuthService.generateToken({
        id: testUserId,
        email: 'trash-tester@test.com',
        role: 'admin',
        siteId: testSiteId
      })

      // Create a dummy document directly in the soft-delete collection
      const trashDoc = await adapter.create('posts', {
        title: 'Test Trashed Post',
        slug: 'test-trashed-post',
        deletedAt: new Date(),
        deletedBy: testUserId,
        siteId: testSiteId
      })
      trashedDocId = trashDoc.id || trashDoc._id.toString()
    } catch (e) {}
  })

  afterAll(async () => {
    await zenith.stop()
  })

  it('Lists all items in the trash', async () => {
    const res = await request(app)
      .get('/api/v1/trash')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.some((d: any) => (d.id || d._id) === trashedDocId)).toBe(true)
  })

  it('Restores a trashed item', async () => {
    const res = await request(app)
      .post(`/api/v1/trash/restore`)
      .send({ collection: 'posts', id: trashedDocId })
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect(res.status).toBe(200)
    
    // Verify it was moved out of trash
    const fetchRes = await request(app)
      .get(`/api/v1/trash`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect(fetchRes.body.data.some((d: any) => (d.id || d._id) === trashedDocId)).toBe(false)
  })
})
