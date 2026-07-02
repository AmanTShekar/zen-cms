import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { ZenithEngine as Zenith } from '../../../../packages/core/src/index'
import { getTestConfig } from '../utils/test-config'
import { AuthService } from '../../../../packages/core/src/services/auth'

describe('Workspaces Router Integration', () => {
  let app: any
  let zenith: Zenith
  let adapter: any
  let adminToken: string
  let workspaceId: string

  beforeAll(async () => {
    zenith = new Zenith({ config: getTestConfig() })
    await zenith.start(0)
    app = zenith.app
    adapter = zenith.adapter

    try {
      const user = await adapter.create('users', { email: 'workspaces-tester@test.com', password: 'abc', role: 'admin' })
      const testUserId = user.id || user._id.toString()

      adminToken = AuthService.generateToken({
        id: testUserId,
        email: 'workspaces-tester@test.com',
        role: 'admin',
      })
    } catch (e) {}
  })

  afterAll(async () => {
    await zenith.stop()
  })

  it('Lists all workspaces (auto-creates default if none exist)', async () => {
    const res = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Creates a new workspace', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Integration Test Workspace',
        slug: 'integration-test-ws'
      })
    
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Integration Test Workspace')
    expect(res.body.data.slug).toBe('integration-test-ws')
    workspaceId = res.body.data.id || res.body.data._id
  })

  it('Fails to create a workspace with duplicate slug', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Workspace',
        slug: 'integration-test-ws'
      })
    
    expect(res.status).toBe(400) // validation error or duplicate error
  })

  it('Fetches a specific workspace', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Integration Test Workspace')
  })

  it('Updates a workspace', async () => {
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Workspace Name'
      })
    
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Updated Workspace Name')
  })

  it('Deletes a workspace', async () => {
    const res = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(200)
    
    // Verify it's gone
    const fetchRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(fetchRes.status).toBe(404)
  })
})
