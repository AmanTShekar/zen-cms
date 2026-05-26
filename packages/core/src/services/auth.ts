import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { AdapterFactory } from '../database/adapters/AdapterFactory'

// ── Security: Hard-fail if secrets are missing in production ──────────────────
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('[Zenith] FATAL: JWT_SECRET environment variable must be set in production.')
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      '[Zenith] FATAL: JWT_REFRESH_SECRET environment variable must be set in production.'
    )
  }
}

// In dev, these fallbacks are acceptable because the production guard above
// throws if either secret is missing when NODE_ENV=production.
const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret_change_in_prod'
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev_fallback_refresh_change_in_prod'
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
   * Short-lived access token (15 minutes)
   */
  generateToken(user: AuthUser): string {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '15m',
    })
  },

  /**
   * Long-lived refresh token — stores ONLY the user ID.
   * The role is always re-fetched from the DB to prevent privilege escalation via stolen tokens.
   */
  generateRefreshToken(user: AuthUser): string {
    return jwt.sign({ id: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '7d' })
  },

  verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser & Record<string, unknown>
      return { id: decoded.id, email: decoded.email, role: decoded.role }
    } catch {
      return null
    }
  },

  /**
   * Verifies a refresh token and returns only the user ID.
   * Full user data (with current role) must be fetched from DB after verification.
   */
  verifyRefreshToken(token: string): { id: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload &
        Record<string, unknown>
      if (decoded.type !== 'refresh') return null
      return { id: decoded.id }
    } catch {
      return null
    }
  },

  validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' }
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' }
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' }
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
    const byEmail = await adapter.find<any>('users', { email: lower })
    if (byEmail[0]) return byEmail[0]
    const byUsername = await adapter.find<any>('users', { username: lower })
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
    const users = await adapter.find<any>('users', {
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    })
    const user = users[0] || null
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

