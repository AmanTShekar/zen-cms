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
    zenith = new Zenith(getTestConfig())
    await zenith.init()
    app = zenith.getExpressApp()

    tenantAToken = jwt.sign({ id: 'user_a', role: 'admin', siteId: tenantA_ID }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' })
    tenantBToken = jwt.sign({ id: 'user_b', role: 'admin', siteId: tenantB_ID }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' })

    // Seed data
    await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .set('x-zenith-site-id', tenantA_ID)
      .send({ title: 'Tenant A Post' })

    await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .set('x-zenith-site-id', tenantB_ID)
      .send({ title: 'Tenant B Post' })
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
    expect([401, 403]).toContain(res.status)
  })
})
