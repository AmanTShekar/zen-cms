import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ZenithEngine as Zenith } from '../../src/index'
import { getTestConfig } from '../utils/test-config'
import request from 'supertest'
import jwt from 'jsonwebtoken'

describe('Multi-Tenant Data Isolation', () => {
  let app: any
  let zenith: Zenith
  let tenantAToken: string
  let tenantBToken: string
  let tenantA_ID = 'site_A_123'
  let tenantB_ID = 'site_B_456'

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0) // Start on random port
    app = zenith.app

    tenantAToken = jwt.sign({ id: '000000000000000000000001', role: 'editor', siteId: tenantA_ID }, process.env.JWT_SECRET || 'dev_fallback_secret_change_in_prod', { expiresIn: '1h' })
    tenantBToken = jwt.sign({ id: '000000000000000000000002', role: 'editor', siteId: tenantB_ID }, process.env.JWT_SECRET || 'dev_fallback_secret_change_in_prod', { expiresIn: '1h' })

    const adapter = zenith.adapter
    try {
      await adapter.deleteMany('z_sites', {})
      await adapter.deleteMany('posts', {})
    } catch {}
    
    try {
      await adapter.create('z_sites', { slug: tenantA_ID, name: 'Tenant A', ownerId: '000000000000000000000001' })
    } catch (err: any) { console.error('Site A create err:', err.message) }
    try {
      await adapter.create('z_sites', { slug: tenantB_ID, name: 'Tenant B', ownerId: '000000000000000000000002' })
    } catch (err: any) { console.error('Site B create err:', err.message) }

    // Seed data
    const resA = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .set('x-zenith-site-id', tenantA_ID)
      .send({ title: 'Tenant A Post', content: 'content A', slug: 'tenant-a-post' })
    if (resA.status >= 400) console.error('Seed A failed:', resA.body)

    const resB = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .set('x-zenith-site-id', tenantB_ID)
      .send({ title: 'Tenant B Post', content: 'content B', slug: 'tenant-b-post' })
    if (resB.status >= 400) console.error('Seed B failed:', resB.body)
  })

  afterAll(async () => {
    // cleanup
    await zenith.stop()
  })

  it('Tenant A should only see Tenant A data', async () => {
    const res = await request(app)
      .get('/api/v1/posts')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .set('x-zenith-site-id', tenantA_ID)
    
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
    expect(res.body.data[0].title).toBe('Tenant A Post')
  })

  it('Tenant B should only see Tenant B data', async () => {
    const res = await request(app)
      .get('/api/v1/posts')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .set('x-zenith-site-id', tenantB_ID)
    
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
    expect(res.body.data[0].title).toBe('Tenant B Post')
  })

  it('Cross-tenant data access must be blocked', async () => {
    // Tenant B trying to access Tenant A's site context
    const res = await request(app)
      .get('/api/v1/posts')
      .set('Authorization', `Bearer ${tenantBToken}`) // JWT specifies siteId: tenantB
      .set('x-zenith-site-id', tenantA_ID) // Requesting tenant A
    
    // Custom auth middleware enforces JWT siteId === header siteId, so this should 403
    // Assuming requireAuth handles this
    if (![401, 403].includes(res.status)) console.error('Cross-tenant failed:', res.status, res.body)
    expect([401, 403]).toContain(res.status)
  })
})
