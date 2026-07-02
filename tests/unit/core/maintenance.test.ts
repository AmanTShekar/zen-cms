import { describe, it, expect, vi, beforeEach } from 'vitest'
import { maintenanceMiddleware } from '../../../packages/core/src/middleware/maintenance'
import { AdapterFactory } from '../../../packages/core/src/database/adapters/AdapterFactory'

vi.mock('../../../packages/core/src/database/adapters/AdapterFactory', () => {
  const mockAdapter = {
    find: vi.fn(),
  }
  return {
    AdapterFactory: {
      getActiveAdapter: vi.fn(() => mockAdapter),
    },
  }
})

describe('Zenith Maintenance Mode Middleware', () => {
  let req: any
  let res: any
  let next: any
  let mockAdapter: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockAdapter = AdapterFactory.getActiveAdapter()
    req = {
      path: '/api/v1/collections/posts',
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    }
    next = vi.fn()
  })

  it('should bypass middleware if the path is excluded (auth)', async () => {
    req.path = '/api/v1/auth/login'
    await maintenanceMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should bypass middleware if the path is excluded (health)', async () => {
    req.path = '/api/v1/health'
    await maintenanceMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should bypass middleware if the path is excluded (system settings)', async () => {
    req.path = '/api/v1/system/settings'
    await maintenanceMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should bypass middleware if maintenanceMode is false', async () => {
    mockAdapter.find.mockResolvedValue([{ siteName: 'Test', maintenanceMode: false }])
    await maintenanceMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should block non-excluded requests with 503 if maintenanceMode is true', async () => {
    mockAdapter.find.mockResolvedValue([{ siteName: 'Test', maintenanceMode: true }])
    await maintenanceMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Service Unavailable',
        statusCode: 503,
      })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should support snake_case maintenance_mode mapping', async () => {
    mockAdapter.find.mockResolvedValue([{ siteName: 'Test', maintenance_mode: true }])
    await maintenanceMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(next).not.toHaveBeenCalled()
  })

  it('should gracefully proceed to next() if settings cannot be loaded', async () => {
    mockAdapter.find.mockRejectedValue(new Error('DB Timeout'))
    await maintenanceMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
