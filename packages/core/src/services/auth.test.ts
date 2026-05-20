import { describe, it, expect } from 'vitest'
import { AuthService } from './auth'

describe('Auth Service', () => {
  it('should hash and compare passwords correctly', async () => {
    const password = 'MySecretPassword123'
    const hash = await AuthService.hashPassword(password)

    expect(hash).not.toBe(password)
    expect(await AuthService.comparePassword(password, hash)).toBe(true)
    expect(await AuthService.comparePassword('wrongPassword', hash)).toBe(false)
  })

  it('should generate and verify access tokens (15min expiry)', () => {
    const user = { id: '123', email: 'test@example.com', role: 'admin' as const }
    const token = AuthService.generateToken(user)

    expect(token).toBeDefined()
    const verified = AuthService.verifyToken(token)
    expect(verified).toMatchObject({ id: '123', email: 'test@example.com', role: 'admin' })
  })

  it('should generate and verify refresh tokens (7d expiry)', () => {
    const user = { id: '456', email: 'editor@example.com', role: 'editor' as const }
    const refreshToken = AuthService.generateRefreshToken(user)

    expect(refreshToken).toBeDefined()
    const verified = AuthService.verifyRefreshToken(refreshToken)
    expect(verified).toMatchObject({ id: '456' })
  })

  it('should return null for invalid tokens', () => {
    expect(AuthService.verifyToken('invalid-token')).toBeNull()
    expect(AuthService.verifyRefreshToken('invalid-token')).toBeNull()
  })

  it('should validate password strength', () => {
    expect(AuthService.validatePassword('short')).toMatchObject({ valid: false })
    expect(AuthService.validatePassword('nouppercase1')).toMatchObject({ valid: false })
    expect(AuthService.validatePassword('NoNumbers')).toMatchObject({ valid: false })
    expect(AuthService.validatePassword('ValidPass1')).toMatchObject({ valid: true })
  })
})
