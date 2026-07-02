import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { TenantCascadeService } from '../../../../packages/core/src/services/tenant-cascade'
import request from 'supertest'
import jwt from 'jsonwebtoken'

describe('Compliance & Tenant Cascades', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  
  let adminToken: string
  let testUserId: string
  let testWorkspaceId: string
  let testSiteId: string

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    // Seed mock data for tenant cascade test
    try {
      const user = await adapter.create<any>('users', { email: 'cascade@test.com' })
      testUserId = user.id || user._id.toString()
      
      const ws = await adapter.create<any>('z_workspaces', { slug: 'cascade-workspace', name: 'Cascade Workspace', ownerId: testUserId })
      testWorkspaceId = ws.id || ws._id.toString()
      
      const site = await adapter.create<any>('z_sites', { slug: 'cascade-site', name: 'Cascade Site', workspaceId: testWorkspaceId, ownerId: testUserId })
      testSiteId = site.id || site._id.toString()
      
      adminToken = jwt.sign({ id: testUserId, role: 'admin' }, process.env.JWT_SECRET || 'dev_fallback_secret_change_in_prod', { expiresIn: '1h' })

      // Seed content tied to site
      await adapter.create('z_collections', { name: 'Test Collection', slug: 'test_collection', siteId: testSiteId })
      try {
        await adapter.create('test_collection', { title: 'Orphaned Content', siteId: testSiteId })
      } catch (e) {
        // test_collection table might not exist in SQL tests if not registered, but works in mongo
      }
      // Media tied to site
      await adapter.create('media', { url: 'https://cdn.test.com/logo.png', siteId: 'cascade-site', uploadedBy: testUserId })
    } catch (err: any) {
      console.error('Seed cascade data err:', err.message)
    }
  })

  afterAll(async () => {
    await zenith.stop()
  })

  it('GDPR Data Export includes user profile, workspaces, sites, and media', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me/export')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('profile')
    expect(res.body).toHaveProperty('workspaces')
    expect(res.body).toHaveProperty('sites')
    expect(res.body).toHaveProperty('media')
    
    // Verify it fetched the correct owned items
    expect(res.body.workspaces.some((ws: any) => ws.id === testWorkspaceId || ws._id === testWorkspaceId)).toBe(true)
    expect(res.body.sites.some((site: any) => site.id === testSiteId || site._id === testSiteId)).toBe(true)
  })

  it('TenantCascadeService wipes out child sites and media when user is deleted', async () => {
    // Fire the user deletion endpoint to trigger cascade
    const res = await request(app)
      .delete('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)

    // Await event loop / async cascade if needed (the endpoint awaits it though)
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Verify User is gone
    const mongoose = (await import('mongoose')).default
    const rawUser = await mongoose.connection.db?.collection('users').findOne({ _id: new mongoose.Types.ObjectId(testUserId) })
    console.log('RAW USER IN DB:', rawUser)

    const users = await adapter.find('users', { id: testUserId })
    console.log('ADAPTER USERS:', users)
    expect(users.length).toBe(0)

    // Verify Workspace is gone
    const workspaces = await adapter.find('z_workspaces', { id: testWorkspaceId })
    expect(workspaces.length).toBe(0)

    // Verify Site is gone
    const sites = await adapter.find('z_sites', { id: testSiteId })
    expect(sites.length).toBe(0)

    // Verify Media is gone
    const media = await adapter.find('media', { siteId: 'cascade-site' })
    expect(media.length).toBe(0)

    // Verify Collections are gone
    const collections = await adapter.find('z_collections', { siteId: 'cascade-site' })
    expect(collections.length).toBe(0)
  })
})
