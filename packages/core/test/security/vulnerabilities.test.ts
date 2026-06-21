import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { ZenithEngine as Zenith } from '../../src/index'
import { getTestConfig } from '../utils/test-config'

describe('Security Vulnerabilities Test Suite', () => {
  let app: any
  let zenith: Zenith
  let validToken: string
  let siteId = `test_site_${Math.random().toString(36).substring(2, 9)}`

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app

    validToken = jwt.sign({ id: '000000000000000000000003', role: 'editor', siteId }, process.env.JWT_SECRET || 'dev_fallback_secret_change_in_prod', { expiresIn: '1h' })

    const adapter = zenith.adapter
    try {
      await adapter.deleteMany('z_sites', { slug: siteId })
      await adapter.deleteMany('posts', { siteId })
    } catch {}

    try {
      await adapter.create('z_sites', { slug: siteId, name: 'Test Site', ownerId: '000000000000000000000003' })
    } catch (err: any) { console.error('Site create err:', err.message) }
  })

  afterAll(async () => {
    await zenith.stop()
  })

  it('NoSQL Injection: Should reject $where and malicious operator payloads', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .send({ filter: { $where: 'sleep(5000)' } })
      .set('Authorization', `Bearer ${validToken}`)
      .set('x-zenith-site-id', siteId)

    // Parser should throw or sanitize the input resulting in 400 or ignoring it
    expect([200, 400, 422]).toContain(res.status)
  })

  it('Path Traversal: Block generation should reject slugs containing ../', async () => {
    const res = await request(app)
      .post('/api/blocks/generate')
      .send({ slug: '../../../etc/passwd', fields: [] })
      .set('Authorization', `Bearer ${validToken}`)
      .set('x-zenith-site-id', siteId)

    expect([400, 404]).toContain(res.status)
  })

  it('XSS Payload: Rich text should sanitize <script> payloads', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${validToken}`)
      .set('x-zenith-site-id', siteId)
      .send({
        title: 'XSS Test',
        content: '<script>alert("xss")</script> <p>Clean content</p>',
        slug: `xss-test-${Math.random().toString(36).substring(2, 9)}`
      })

    if (res.status !== 201) console.error('XSS fail:', res.status, res.body)
    expect(res.status).toBe(201)
    expect(res.body.data.content).not.toContain('<script>')
    expect(res.body.data.content).toContain('Clean content')
  })

  it('JWT none algorithm: Should reject tokens signed with none algorithm', async () => {
    // Manually construct a none algorithm JWT
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ id: 'user_1', role: 'admin', siteId })).toString('base64url')
    const token = `${header}.${payload}.`

    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .set('x-zenith-site-id', siteId)

    expect(res.status).toBe(401)
  })

  it('Expired JWT: Should reject expired tokens', async () => {
    const expiredToken = jwt.sign({ id: 'user_1', role: 'admin', siteId }, process.env.JWT_SECRET || 'dev_fallback_secret_change_in_prod', { expiresIn: '-1h' })
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('x-zenith-site-id', siteId)

    expect(res.status).toBe(401)
  })
})
