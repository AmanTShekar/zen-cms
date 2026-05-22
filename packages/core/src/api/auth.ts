import { Router, Request, Response, NextFunction } from 'express'

// Middleware to attach site identifier from header for multi‑tenant scoping
export function siteMiddleware(req: Request, res: Response, next: NextFunction) {
  const siteId = req.headers['x-zenith-site-id'];
  if (typeof siteId === 'string') {
    (req as any).siteId = siteId;
    next();
  } else {
    res.status(400).json({ error: 'Missing X-Zenith-Site-Id header' });
  }
}

import crypto from 'crypto'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { AuthService } from '../services/auth'
import { EmailService } from '../services/email'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { createOAuthRouter } from '../auth/strategies/oauth'
import {
  AuthenticationError,
  InvalidPayloadError,
  NotFoundError,
  InvalidTokenError,
  ForbiddenError,
} from '../errors'
import rateLimit from 'express-rate-limit'

const router: Router = Router()
// Apply site middleware to all auth routes
router.use(siteMiddleware)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
})

// ── POST /api/v1/auth/login ──────────────────────────────────────────────────
// Accepts email OR username + password
router.post('/login', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email, username, password } = req.body
    const login = (email || username || '').trim()
    if (!login || !password) throw new InvalidPayloadError('Email or username and password are required')

    const user = await AuthService.resolveUser(login)

    let isLocked = false
    if (user && user.lockUntil) {
      isLocked = new Date(user.lockUntil) > new Date()
    }

    // Constant-time dummy hash to prevent user-enumeration via timing attacks
    if (!user) {
      await AuthService.comparePassword(
        'dummy',
        '$2b$12$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      )
      throw new AuthenticationError()
    }

    const valid = await AuthService.comparePassword(password, user.password)

    if (isLocked) {
      throw new ForbiddenError('Account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes.')
    }

    if (!valid) {
      await AuthService.trackFailedAttempt(login)
      throw new AuthenticationError()
    }

    // Successful login — reset lockout state
    await AuthService.resetFailedAttempts(login)

    const userId = (user.id || user._id).toString()
    const payload = { id: userId, email: user.email, role: user.role }
    const accessToken = AuthService.generateToken(payload)
    const refreshToken = AuthService.generateRefreshToken(payload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    })

    res.json(createResponse({ user: payload }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/register ───────────────────────────────────────────────
router.post('/register', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email, password, role } = req.body
    if (!email || !password) throw new InvalidPayloadError('Email and password are required')

    const adapter = AdapterFactory.getActiveAdapter()
    const existingUsers = await adapter.find<any>('users', { email: email.toLowerCase() })
    if (existingUsers.length > 0) throw new InvalidPayloadError('User already exists')

    const check = AuthService.validatePassword(password)
    if (!check.valid) throw new InvalidPayloadError(check.message!)

    const hashed = await AuthService.hashPassword(password)
    const user = await adapter.create<any>('users', {
      email: email.toLowerCase(),
      password: hashed,
      role: 'editor',
    })

    const userId = (user.id || user._id).toString()
    const payload = { id: userId, email: user.email, role: user.role }
    const accessToken = AuthService.generateToken(payload)
    const refreshToken = AuthService.generateRefreshToken(payload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    // Send welcome email + verification link
    await EmailService.sendWelcomeEmail(user.email, user.email.split('@')[0])
    try {
      const verifyToken = await AuthService.generateVerificationToken(userId)
      const verifyUrl = `${process.env.ADMIN_URL || 'http://localhost:5173'}/verify-email?token=${verifyToken}`
      await EmailService.send({
        to: user.email,
        subject: 'Verify your Zenith CMS email address',
        html: `<p>Hi! Please verify your email by clicking <a href="${verifyUrl}">this link</a>. It expires in 24 hours.</p>`,
      })
    } catch {
      // Verification email failure is non-fatal — user can request resend
    }
    res.status(201).json(createResponse({ user: payload, accessToken }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/refresh ────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) throw new InvalidTokenError()

    const decoded = AuthService.verifyRefreshToken(token)
    if (!decoded) throw new InvalidTokenError()

    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<any>('users', { id: decoded.id })
    const user = users[0] || null
    if (!user) throw new NotFoundError('User')

    const userId = (user.id || user._id).toString()
    const payload = { id: userId, email: user.email, role: user.role }
    const newAccess = AuthService.generateToken(payload)
    const newRefresh = AuthService.generateRefreshToken(payload)

    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.cookie('accessToken', newAccess, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    })

    res.json(createResponse({ success: true }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/logout ─────────────────────────────────────────────────
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' })
  res.clearCookie('accessToken', { httpOnly: true, sameSite: 'strict' })
  res.json(createResponse({ success: true }))
})

// ── GET  /api/v1/auth/me ─────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<any>('users', { id: (req as any).user.id })
    const user = users[0] || null
    if (!user) throw new NotFoundError('User')
    const userId = (user.id || user._id).toString()
    res.json(createResponse({ id: userId, email: user.email, role: user.role }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/forgot-password ───────────────────────────────────────
router.post('/forgot-password', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email } = req.body
    if (!email) throw new InvalidPayloadError('Email is required')

    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<any>('users', { email: email.toLowerCase() })
    const user = users[0] || null

    // Always respond 200 — never reveal if email exists (security)
    if (!user)
      return res.json(
        createResponse({ message: 'If that email exists, a reset link has been sent.' })
      )

    const userId = (user.id || user._id).toString()
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await adapter.deleteMany('z_password_resets', { userId }) // Clear old tokens
    await adapter.create('z_password_resets', { userId, token: tokenHash, expiresAt })

    const resetUrl = `${process.env.ADMIN_URL || 'http://localhost:5173'}/reset-password?token=${token}`
    await EmailService.sendPasswordResetEmail(user.email, resetUrl)

    res.json(createResponse({ message: 'If that email exists, a reset link has been sent.' }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/reset-password ─────────────────────────────────────────
router.post('/reset-password', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { token, password } = req.body
    if (!token || !password) throw new InvalidPayloadError('Token and password are required')

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const adapter = AdapterFactory.getActiveAdapter()
    const resets = await adapter.find<any>('z_password_resets', { token: tokenHash, used: false })
    const record = resets[0] || null
    if (!record || new Date(record.expiresAt) < new Date()) throw new InvalidTokenError()

    const check = AuthService.validatePassword(password)
    if (!check.valid) throw new InvalidPayloadError(check.message!)

    const hashed = await AuthService.hashPassword(password)
    await adapter.update('users', record.userId, { password: hashed })
    
    const recordId = (record.id || record._id).toString()
    await adapter.update('z_password_resets', recordId, { used: true })

    res.json(createResponse({ message: 'Password reset successfully.' }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/verify-email ───────────────────────────────────────────
router.post('/verify-email', async (req: Request, res: Response, next) => {
  try {
    const { token } = req.body
    if (!token) throw new InvalidPayloadError('Verification token is required')

    const userId = await AuthService.verifyEmailToken(token)
    if (!userId) throw new InvalidTokenError('Verification token is invalid or has expired')

    res.json(createResponse({ message: 'Email verified successfully.' }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/resend-verification ────────────────────────────────────
router.post('/resend-verification', authLimiter, requireAuth, async (req: Request, res: Response, next) => {
  try {
    const userId = (req as any).user.id
    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<any>('users', { id: userId })
    const user = users[0] || null
    if (!user) throw new NotFoundError('User')
    if (user.emailVerified) {
      return res.json(createResponse({ message: 'Email is already verified.' }))
    }

    const verifyToken = await AuthService.generateVerificationToken(userId)
    const verifyUrl = `${process.env.ADMIN_URL || 'http://localhost:5173'}/verify-email?token=${verifyToken}`
    await EmailService.send({
      to: user.email,
      subject: 'Verify your Zenith CMS email address',
      html: `<p>Please verify your email by clicking <a href="${verifyUrl}">this link</a>. It expires in 24 hours.</p>`,
    })

    res.json(createResponse({ message: 'Verification email sent.' }))
  } catch (err) {
    next(err)
  }
})

// ── GET  /api/v1/auth/setup-status ───────────────────────────────────────────
router.get('/setup-status', async (req: Request, res: Response, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const count = await adapter.count('users', {})
    res.json(createResponse({ needsSetup: count === 0 }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/setup ──────────────────────────────────────────────────
router.post('/setup', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) throw new InvalidPayloadError('Email and password are required')

    const adapter = AdapterFactory.getActiveAdapter()
    const count = await adapter.count('users', {})
    if (count > 0) {
      throw new ForbiddenError('System is already setup. First-time registration is locked.')
    }

    const check = AuthService.validatePassword(password)
    if (!check.valid) throw new InvalidPayloadError(check.message!)

    const hashed = await AuthService.hashPassword(password)
    const user = await adapter.create<any>('users', {
      email: email.toLowerCase(),
      password: hashed,
      role: 'admin',
    })

    const userId = (user.id || user._id).toString()
    const payload = { id: userId, email: user.email, role: user.role }
    const accessToken = AuthService.generateToken(payload)
    const refreshToken = AuthService.generateRefreshToken(payload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    })

    res.status(201).json(createResponse({ user: payload, accessToken }))
  } catch (err) {
    next(err)
  }
})

// ── OAuth routes ─────────────────────────────────────────────────────────────
router.use('/oauth', createOAuthRouter())

export default router
