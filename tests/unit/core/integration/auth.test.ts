import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'

describe('Auth Router Integration', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  let testSiteId: string
  const testEmail = 'authuser@test.com'
  const testPassword = 'Password123!'

  beforeAll(async () => {
    process.env.ALLOW_REGISTRATION = 'true'
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'auth-setup@test.com', password: 'abc', role: 'admin' })
      const ws = await adapter.create('z_workspaces', { slug: 'auth-ws', name: 'Auth WS', ownerId: user.id || user._id.toString() })
      const site = await adapter.create('z_sites', { slug: 'auth-site', name: 'Auth Site', workspaceId: ws.id || ws._id.toString(), ownerId: user.id || user._id.toString() })
      testSiteId = site.id || site._id.toString()
    } catch (e) {}
  })

  afterAll(async () => {
    delete process.env.ALLOW_REGISTRATION
    await zenith.stop()
  })

  it('Registers a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Zenith-Site-Id', testSiteId)
      .send({ email: testEmail, password: testPassword })
    
    expect(res.status).toBe(201)
    expect(res.body.data.user.email).toBe(testEmail)
    expect(res.body.data.accessToken).toBeDefined()
  })

  it('Logs in the user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Zenith-Site-Id', testSiteId)
      .send({ email: testEmail, password: testPassword })
    
    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe(testEmail)
  })

  it('Fails login with bad password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Zenith-Site-Id', testSiteId)
      .send({ email: testEmail, password: 'wrong' })
    
    expect(res.status).toBe(401)
  })

  it('Locks account after 5 failed attempts', async () => {
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .set('X-Zenith-Site-Id', testSiteId)
        .send({ email: testEmail, password: 'wrong' })
    }
    
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Zenith-Site-Id', testSiteId)
      .send({ email: testEmail, password: testPassword })
    
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('FORBIDDEN')
  })
})
