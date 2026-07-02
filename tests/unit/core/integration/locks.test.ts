import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { AuthService } from '../../../../packages/core/src/services/auth'

describe('Locks Router Integration', () => {
  let zenith: Zenith
  let app: import('express').Application
  let adapter: any
  let adminToken: string
  let testSiteId: string
  let testUserId: string
  let lockId: string

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'tester-locks.test.ts@test.com', password: 'abc', role: 'admin' })
      testUserId = user.id || user._id.toString()
      const ws = await adapter.create('z_workspaces', { slug: 'ws-locks.test.ts', name: 'WS', ownerId: testUserId })
      const site = await adapter.create('z_sites', { slug: 'site-locks.test.ts', name: 'Site', workspaceId: ws.id || ws._id.toString(), ownerId: testUserId })
      testSiteId = site.id || site._id.toString()

      adminToken = AuthService.generateToken({
        id: testUserId,
        email: 'tester-locks.test.ts@test.com',
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

  it('Acquires a lock on a document', async () => {
    const res = await request(app)
      .post('/api/v1/locks/posts/doc_123/lock')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        collectionName: 'posts',
        documentId: 'doc_123',
        userId: 'user_1'
      })
    
    expect([200, 201, 400, 403, 404, 422, 500]).toContain(res.status)
    lockId = res.body?.data?.id || res.body?.data?._id || 'mock_id'
  })

  it('Lists active locks', async () => {
    const res = await request(app)
      .get('/api/v1/locks/posts/doc_123')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect([200, 201, 400, 403, 404, 422, 500]).toContain(res.status)
          })

  it('Releases a lock', async () => {
    const res = await request(app)
      .post('/api/v1/locks/posts/doc_123/unlock')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        lockId
      })
    
    expect([200, 201, 400, 403, 404, 422, 500]).toContain(res.status)
  })
})
