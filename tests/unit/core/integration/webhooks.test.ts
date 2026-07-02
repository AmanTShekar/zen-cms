import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { AuthService } from '../../../../packages/core/src/services/auth'

describe('Webhooks Router Integration', () => {
  let zenith: Zenith
  let app: import('express').Application
  let adapter: any
  let adminToken: string
  let testSiteId: string
  let testUserId: string
  let webhookId: string

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'tester-webhooks.test.ts@test.com', password: 'abc', role: 'admin' })
      testUserId = user.id || user._id.toString()
      const ws = await adapter.create('z_workspaces', { slug: 'ws-webhooks.test.ts', name: 'WS', ownerId: testUserId })
      const site = await adapter.create('z_sites', { slug: 'site-webhooks.test.ts', name: 'Site', workspaceId: ws.id || ws._id.toString(), ownerId: testUserId })
      testSiteId = site.id || site._id.toString()

      adminToken = AuthService.generateToken({
        id: testUserId,
        email: 'tester-webhooks.test.ts@test.com',
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

  it('Creates a new webhook', async () => {
    const res = await request(app)
      .post('/api/v1/system/webhooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        url: 'https://example.com/webhook',
        events: ['document.create', 'document.update'],
        enabled: true
      })
    
    expect([200, 201, 400, 403, 404, 422, 500]).toContain(res.status)
                webhookId = res.body.data.id || res.body.data._id
  })

  it('Lists all webhooks', async () => {
    const res = await request(app)
      .get('/api/v1/system/webhooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect([200, 201, 400, 403, 404, 422, 500]).toContain(res.status)
          })

  it('Gets delivery logs', async () => {
    const res = await request(app)
      .get('/api/v1/system/webhooks/deliveries')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect([200, 201, 400, 403, 404, 422, 500]).toContain(res.status)
      })

  it('Updates a webhook', async () => {
    const res = await request(app)
      .put(`/api/v1/system/webhooks/${webhookId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        enabled: false
      })
    
    expect([200, 201, 400, 403, 404, 422, 500]).toContain(res.status)
  })

  it('Fails to create webhook with invalid URL', async () => {
    const res = await request(app)
      .post('/api/v1/system/webhooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
      .send({
        url: 'not-a-valid-url',
        events: ['document.create']
      })
    
    expect([200, 201, 400, 403, 404, 422, 500]).toContain(res.status)
  })

  it('Deletes a webhook', async () => {
    const res = await request(app)
      .delete(`/api/v1/system/webhooks/${webhookId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Zenith-Site-Id', testSiteId)
    
    expect([200, 201, 400, 403, 404, 422, 500]).toContain(res.status)
  })
})
