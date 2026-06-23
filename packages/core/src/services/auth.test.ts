import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from './auth'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { RBACEngine } from './rbac'

vi.mock('../database/adapters/AdapterFactory', () => {
  return {
    AdapterFactory: {
      getActiveAdapter: vi.fn()
    }
  }
})

describe('AuthService and RBAC Engine (Enterprise Readiness)', () => {
  let mockAdapter: Record<string, unknown>

  beforeEach(() => {
    vi.resetAllMocks()
    mockAdapter = {
      findOne: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    }
    ;(AdapterFactory.getActiveAdapter as Record<string, unknown>).mockReturnValue(mockAdapter)
  })

  describe('AuthService', () => {
    it('tracks failed login attempts and locks out users', async () => {
      mockAdapter.find.mockResolvedValueOnce([{
        id: 'user-1',
        email: 'test@example.com',
        failedLoginAttempts: 4,
        lockUntil: null
      }])

      const attempt = await AuthService.trackFailedAttempt('test@example.com')
      
      expect(mockAdapter.update).toHaveBeenCalledWith('users', 'user-1', expect.objectContaining({
        failedLoginAttempts: 5,
        lockUntil: expect.any(Date)
      }))
      
      expect(attempt.locked).toBe(true)
      expect(attempt.attemptsLeft).toBe(0)
    })

    it('resets failed attempts on successful login', async () => {
      mockAdapter.find.mockResolvedValueOnce([{
        id: 'user-1',
        email: 'test@example.com',
        failedLoginAttempts: 3
      }])

      await AuthService.resetFailedAttempts('test@example.com')

      expect(mockAdapter.update).toHaveBeenCalledWith('users', 'user-1', {
        failedLoginAttempts: 0,
        lockUntil: null
      })
    })

    it('hashes passwords uniquely', async () => {
      const hash1 = await AuthService.hashPassword('SuperSecret123!')
      const hash2 = await AuthService.hashPassword('SuperSecret123!')
      expect(hash1).not.toEqual(hash2)
      
      const isValid = await AuthService.comparePassword('SuperSecret123!', hash1)
      expect(isValid).toBe(true)
    })
  })

  describe('RBACEngine', () => {
    it('grants admin users wildcard access', async () => {
      const access = await RBACEngine.checkAccess('admin', 'posts', 'delete')
      expect(access).toBe(true)
    })

    it('enforces specific resource permissions from database custom roles', async () => {
      mockAdapter.find.mockResolvedValue([{
        roleName: 'custom-writer',
        hasWildcard: false,
        permissions: [
          { resource: 'posts', actions: ['create', 'read'] },
          { resource: 'pages', actions: ['read'] }
        ]
      }])

      const canCreatePost = await RBACEngine.checkAccess('custom-writer', 'posts', 'create')
      const canDeletePost = await RBACEngine.checkAccess('custom-writer', 'posts', 'delete')
      
      expect(canCreatePost).toBe(true)
      expect(canDeletePost).toBe(false)
    })

    it('falls back to secure defaults if role is missing in db', async () => {
      mockAdapter.find.mockResolvedValue([]) // Not found
      
      const viewerRead = await RBACEngine.checkAccess('viewer', 'posts', 'read')
      const viewerWrite = await RBACEngine.checkAccess('viewer', 'posts', 'update')
      const editorDelete = await RBACEngine.checkAccess('editor', 'posts', 'delete')

      expect(viewerRead).toBe(true)
      expect(viewerWrite).toBe(false)
      expect(editorDelete).toBe(false)
    })
  })
})
