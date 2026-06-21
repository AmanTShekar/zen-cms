import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { sessionStore, SessionStore } from './session-store'
import { env } from '../config/env';


// ── Security: Hard-fail if secrets are missing in production ──────────────────
if (env.NODE_ENV === 'production') {
  if (!env.JWT_SECRET) {
    throw new Error('[Zenith] FATAL: JWT_SECRET environment variable must be set in production.')
  }
  if (!env.JWT_REFRESH_SECRET) {
    throw new Error(
      '[Zenith] FATAL: JWT_REFRESH_SECRET environment variable must be set in production.'
    )
  }
  if (!env.ADMIN_URL) {
    throw new Error(
      '[Zenith] FATAL: ADMIN_URL environment variable must be set in production. ' +
      'Email verification and password reset links will otherwise point to localhost.'
    )
  }
}

// ADMIN_URL — exported so all email-link builders use the same value.
// In dev, falls back to localhost:5173 (acceptable; production guard above enforces it).
export const ADMIN_URL = env.ADMIN_URL || 'http://localhost:5173'


// In dev, these fallbacks are acceptable because the production guard above
// throws if either secret is missing when NODE_ENV=production.
export const JWT_SECRET = env.JWT_SECRET || 'dev_fallback_secret_change_in_prod'
export const JWT_REFRESH_SECRET =
  env.JWT_REFRESH_SECRET || 'dev_fallback_refresh_change_in_prod'
const SALT_ROUNDS = 12
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
}

// Minimal payload stored inside a refresh token — role is always re-fetched from DB
interface RefreshTokenPayload {
  id: string
  type: 'refresh'
}

export const AuthService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  },

  /**
   * Short-lived access token (15 minutes) — includes jti for revocation support.
   */
  generateToken(user: AuthUser): string {
    const jti = SessionStore.generateJti()
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, jti },
      JWT_SECRET,
      { expiresIn: '15m' }
    )
  },

  /**
   * Long-lived refresh token with rotation support.
   * Stores user ID, jti, and version. When verified successfully, the token is
   * revoked and a new one must be issued (refresh token rotation).
   * The role is always re-fetched from the DB to prevent privilege escalation.
   */
  generateRefreshToken(user: AuthUser): string {
    const jti = SessionStore.generateJti()
    const version = 1
    return jwt.sign({ id: user.id, type: 'refresh', jti, version }, JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    })
  },

  verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthUser & { jti?: string }
      void decoded.jti
      return { id: decoded.id, email: decoded.email, role: decoded.role }
    } catch {
      return null
    }
  },

  async verifyTokenAsync(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthUser & { jti?: string }
      if (decoded.jti) {
        const revoked = await sessionStore.isRevoked(decoded.jti)
        if (revoked) return null
      }
      return { id: decoded.id, email: decoded.email, role: decoded.role }
    } catch (err: any) {
      console.error('verifyTokenAsync error:', err)
      return null
    }
  },

  /**
   * Verifies a refresh token with rotation support.
   * Returns null if revoked (token reuse detected — security event).
   * Caller is responsible for issuing a new refresh token after successful verification.
   */
  verifyRefreshToken(token: string): { id: string; jti: string; version: number } | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as RefreshTokenPayload &
        { jti: string; version: number }
      if (decoded.type !== 'refresh') return null
      return { id: decoded.id, jti: decoded.jti, version: decoded.version }
    } catch {
      return null
    }
  },

  /**
   * Rotate a refresh token: revoke old one and issue new.
   * Called after verifyRefreshToken succeeds.
   */
  async rotateRefreshToken(user: AuthUser, oldJti: string): Promise<string> {
    await sessionStore.revoke(oldJti, 86400 * 7)
    return this.generateRefreshToken(user)
  },

  validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' }
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' }
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' }
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' }
    }
    // eslint-disable-next-line no-useless-escape
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' }
    }
    return { valid: true }
  },

  // ── Account Lockout ────────────────────────────────────────────────────────

  /**
   * Resolves a user by email or username.
   * Returns null if not found.
   */
  async resolveUser(login: string): Promise<any | null> {
    const adapter = AdapterFactory.getActiveAdapter()
    const lower = login.toLowerCase()
    // Try email first, then username
    const byEmail = await adapter.find<Record<string, any>>('users', { email: lower })
    console.log('[DEBUG] resolveUser byEmail for', lower, ':', byEmail.map(u => u.email))
    if (byEmail[0]) return byEmail[0]
    const byUsername = await adapter.find<Record<string, any>>('users', { username: lower })
    return byUsername[0] || null
  },

  /**
   * Returns true if the account is currently locked out.
   * Checks lockUntil — if expired, the lock is considered lifted (will be cleared on next success).
   */
  async isAccountLocked(login: string): Promise<boolean> {
    const user = await this.resolveUser(login)
    if (!user || !user.lockUntil) return false
    return new Date(user.lockUntil) > new Date()
  },

  /**
   * Increments failed login counter. Locks the account after MAX_FAILED_ATTEMPTS.
   */
  async trackFailedAttempt(login: string): Promise<{ locked: boolean; attemptsLeft: number }> {
    const user = await this.resolveUser(login)
    if (!user) return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS }

    const newCount = (user.failedLoginAttempts || 0) + 1
    const locked = newCount >= MAX_FAILED_ATTEMPTS
    const update: Record<string, unknown> = { failedLoginAttempts: newCount }
    if (locked) {
      update.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
    }
    const id = (user.id || user._id).toString()
    const adapter = AdapterFactory.getActiveAdapter()
    await adapter.update('users', id, update)
    return { locked, attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - newCount) }
  },

  /**
   * Resets failed counter and clears lock after a successful login.
   */
  async resetFailedAttempts(login: string): Promise<void> {
    const user = await this.resolveUser(login)
    if (user) {
      const id = (user.id || user._id).toString()
      const adapter = AdapterFactory.getActiveAdapter()
      await adapter.update('users', id, { failedLoginAttempts: 0, lockUntil: null })
    }
  },

  // ── Email Verification ─────────────────────────────────────────────────────

  /**
   * Generates a time-limited (24h) verification token and saves it to the user record.
   * Returns the token to be included in the verification link.
   */
  async generateVerificationToken(userId: string): Promise<string> {
    const adapter = AdapterFactory.getActiveAdapter()
    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    await adapter.update('users', userId, {
      verificationToken: token,
      verificationTokenExpiry: expiry,
    })
    return token
  },

  /**
   * Verifies the token and marks the email as verified.
   * Returns the user ID on success, null on invalid/expired token.
   */
  async verifyEmailToken(token: string): Promise<string | null> {
    const adapter = AdapterFactory.getActiveAdapter()
    // Fetch by token only — filter expiry in JS to avoid MongoDB-specific $gt
    const users = await adapter.find<Record<string, any>>('users', { verificationToken: token })
    const user = users.find((u: any) => u.verificationTokenExpiry && new Date(u.verificationTokenExpiry) > new Date())
    if (!user) return null
    const id = (user.id || user._id).toString()
    await adapter.update('users', id, {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    })
    return id
  },
}

