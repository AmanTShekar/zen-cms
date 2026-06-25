/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import * as otplibPkg from 'otplib'
const authenticator = (otplibPkg as Record<string, any>).authenticator || (otplibPkg as Record<string, any>).default?.authenticator
import QRCode from 'qrcode'

// Middleware to attach site identifier from header for multi‑tenant scoping
export function siteMiddleware(req: Request, res: Response, next: NextFunction) {
  const siteId = req.headers['x-zenith-site-id'];

  if (typeof siteId === 'string') {
    (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).siteId = siteId;
  }
  next();
}

import crypto from 'crypto'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { AuthService, JWT_SECRET, JWT_REFRESH_SECRET } from '../services/auth'
import { EmailService } from '../services/email'
import { sessionStore, SessionStore } from '../services/session-store'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { createOAuthRouter } from '../auth/strategies/oauth'
import { cookieConsentMiddleware } from '../middleware/cookie-consent'
import { mfaRouter } from './auth/mfa'
import { recoveryRouter } from './auth/recovery'
import { ssoRouter } from './auth/sso'
import passport from 'passport'
// Load strategies
import '../services/AuthStrategyRegistry'
import {
  AuthenticationError,
  InvalidPayloadError,
  NotFoundError,
  InvalidTokenError,
  ForbiddenError,
} from '../errors'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../config/env';


const emailSchema = z.string().email().max(254)
const passwordSchema = z.string().min(8).max(128)

const router: Router = Router()
// Apply site middleware to all auth routes
router.use(siteMiddleware)
router.use(cookieConsentMiddleware)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})

/** Resolve admin URL from env; fallback to localhost only in dev. */
function getAdminUrl(): string {
  if (env.ADMIN_URL) return env.ADMIN_URL
  if (env.NODE_ENV === 'production') {
    throw new Error('ADMIN_URL environment variable is required in production')
  }
  return 'http://localhost:5173'
}

// ── POST /api/v1/auth/login ──────────────────────────────────────────────────
// Accepts email OR username + password
router.post('/login', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email, username, password } = req.body
    const login = (email || username || '').trim()
    if (!login || !password) throw new InvalidPayloadError('Email or username and password are required')
    if (email) {
      const emailResult = emailSchema.safeParse(email)
      if (!emailResult.success) throw new InvalidPayloadError('Invalid email format')
    }

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
      const lockUntil = new Date(user.lockUntil!)
      const remainingMs = Math.max(0, lockUntil.getTime() - Date.now())
      const remainingMin = Math.ceil(remainingMs / 60000)
      throw new ForbiddenError(
        `Account is locked. Try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`,
        { locked: true, remainingMin, lockUntil: lockUntil.toISOString() }
      )
    }

    if (!valid) {
      const attemptInfo = await AuthService.trackFailedAttempt(login)
      throw new AuthenticationError(
        attemptInfo.locked
          ? 'Account locked due to too many failed attempts.'
          : `Invalid credentials. ${attemptInfo.attemptsLeft} attempt${attemptInfo.attemptsLeft !== 1 ? 's' : ''} remaining.`,
        {
          attemptsLeft: attemptInfo.attemptsLeft,
          locked: attemptInfo.locked,
          maxAttempts: 5,
        }
      )
    }

    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ id: user.id || user._id, type: '2fa_temp' }, JWT_SECRET, { expiresIn: '5m' })
      return res.json(createResponse({ require2FA: true, tempToken }))
    }

    // Successful login — reset lockout state
    await AuthService.resetFailedAttempts(login)

    const userId = (user.id || user._id).toString()
    const payload = { id: userId, email: user.email, role: user.role, color: user.color }
    const accessToken = AuthService.generateToken(payload)
    const refreshToken = AuthService.generateRefreshToken(payload)

    // Register session for token revocation
    const decodedAccess = jwt.decode(accessToken) as Record<string, any>
    if (decodedAccess?.jti) {
      await sessionStore.add(userId, decodedAccess.jti, user.email, 900, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      })
    }
    const decodedRefresh = jwt.decode(refreshToken) as Record<string, any>
    if (decodedRefresh?.jti) {
      await sessionStore.add(userId, decodedRefresh.jti, user.email, 604800, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      })
    }

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
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
    const adapter = AdapterFactory.getActiveAdapter()
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const query = siteId ? { siteId } : {}
    const settings = await adapter.findOne<Record<string, any>>('z_settings', query)

    if (!settings?.allowRegistration && process.env.ALLOW_REGISTRATION !== 'true') {
      throw new ForbiddenError('Open registration is disabled.')
    }

    const { email, password, role } = req.body
    if (!email || !password) throw new InvalidPayloadError('Email and password are required')
    const emailResult = emailSchema.safeParse(email)
    if (!emailResult.success) throw new InvalidPayloadError('Invalid email format')

    const existingUsers = await adapter.find<Record<string, any>>('users', { email: email.toLowerCase() })
    if (existingUsers.length > 0) throw new InvalidPayloadError('User already exists')

    const check = AuthService.validatePassword(password)
    if (!check.valid) throw new InvalidPayloadError(check.message!)

    const hashed = await AuthService.hashPassword(password)
    const user = await adapter.create<Record<string, any>>('users', {
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
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    // Send welcome email + verification link
    await EmailService.sendWelcomeEmail(user.email, user.email.split('@')[0], siteId)
    try {
      const verifyToken = await AuthService.generateVerificationToken(userId)
      const verifyUrl = `${getAdminUrl()}/verify-email?token=${verifyToken}`
      await EmailService.send({
        to: user.email,
        subject: 'Verify your Zenith CMS email address',
        html: `<p>Hi! Please verify your email by clicking <a href="${verifyUrl}">this link</a>. It expires in 24 hours.</p>`,
      }, undefined, siteId)
    } catch {
      // Verification email failure is non-fatal — user can request resend
    }
    
    // Set req.user so the audit middleware can capture this registration event
    ;(req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user = { id: userId, email: user.email, name: user.email }

    res.status(201).json(createResponse({ user: payload, accessToken }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/verify-email ──────────────────────────────────────────
router.post('/verify-email', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { token } = req.body
    if (!token) throw new InvalidPayloadError('Verification token is required')

    const userId = await AuthService.verifyEmailToken(token)
    if (!userId) {
      throw new AuthenticationError('Invalid or expired verification token')
    }

    res.json(createResponse({ success: true, message: 'Email successfully verified' }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/resend-verification ───────────────────────────────────
router.post('/resend-verification', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email } = req.body
    if (!email) throw new InvalidPayloadError('Email is required')

    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const user = await AuthService.resolveUser(email)
    
    // Always return success even if user doesn't exist to prevent email enumeration
    if (!user || user.emailVerified) {
      return res.json(createResponse({ success: true, message: 'If that email is registered and unverified, a new link has been sent.' }))
    }

    const userId = (user.id || user._id).toString()
    const verifyToken = await AuthService.generateVerificationToken(userId)
    const verifyUrl = `${getAdminUrl()}/verify-email?token=${verifyToken}`
    
    await EmailService.send({
      to: user.email,
      subject: 'Verify your Zenith CMS email address',
      html: `<p>Hi! Please verify your email by clicking <a href="${verifyUrl}">this link</a>. It expires in 24 hours.</p>`,
    }, undefined, siteId)

    res.json(createResponse({ success: true, message: 'If that email is registered and unverified, a new link has been sent.' }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/refresh ────────────────────────────────────────────────
router.post('/refresh', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) throw new InvalidTokenError()

    const decoded = AuthService.verifyRefreshToken(token)
    if (!decoded) throw new InvalidTokenError()

    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<Record<string, any>>('users', { id: decoded.id })
    const user = users[0] || null
    if (!user) throw new NotFoundError('User')

    const userId = (user.id || user._id).toString()
    const payload = { id: userId, email: user.email, role: user.role }
    const newAccess = AuthService.generateToken(payload)
    const newRefresh = await AuthService.rotateRefreshToken(payload, (decoded as Record<string, any>).jti)

    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.cookie('accessToken', newAccess, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    })

    res.json(createResponse({ success: true }))
  } catch (err) {
    next(err)
  }
})

router.use('/2fa', mfaRouter)

// ── POST /api/v1/auth/logout ─────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  // Revoke the access and refresh tokens
  const token = req.cookies?.accessToken
  if (token) {
    const decoded = jwt.decode(token) as Record<string, any>
    if (decoded?.jti) {
      await sessionStore.revoke(decoded.jti, decoded.exp - Math.floor(Date.now() / 1000))
    }
  }
  const refreshToken = req.cookies?.refreshToken
  if (refreshToken) {
    const decoded = jwt.decode(refreshToken) as Record<string, any>
    if (decoded?.jti) {
      await sessionStore.revoke(decoded.jti, 604800)
    }
  }

  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' })
  res.clearCookie('accessToken', { httpOnly: true, sameSite: 'strict' })
  res.json(createResponse({ success: true }))
})

// ── POST /api/v1/auth/logout-all ─────────────────────────────────────────────
router.post('/logout-all', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const userId = (req.user as Record<string, any>).id
    const count = await sessionStore.revokeAllForUser(userId)

    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' })
    res.clearCookie('accessToken', { httpOnly: true, sameSite: 'strict' })

    res.json(createResponse({ success: true, revokedSessions: count }))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/auth/sessions ────────────────────────────────────────────────
router.get('/sessions', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const userId = (req.user as Record<string, any>).id
    const sessions = await sessionStore.listSessions(userId)
    res.json(createResponse({ sessions }))
  } catch (err) {
    next(err)
  }
})

// ── GET  /api/v1/auth/me ─────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<Record<string, any>>('users', { id: (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user.id })
    const user = users[0] || null
    if (!user) throw new NotFoundError('User')
    const userId = (user.id || user._id).toString()
    res.json(createResponse({ id: userId, email: user.email, role: user.role, color: user.color, twoFactorEnabled: user.twoFactorEnabled || false }))
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/auth/me ──────────────────────────────────────────────────
router.delete('/me', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const userId = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user.id
    
    // Revoke all active sessions
    await sessionStore.revokeAllForUser(userId)
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' })
    res.clearCookie('accessToken', { httpOnly: true, sameSite: 'strict' })

    // Hard delete user from the system
    await adapter.delete('users', userId)

    // Emit event for downstream cleanup (e.g. content anonymization or deletion)
    const { eventHub } = await import('../services/event-hub')
    eventHub.emit('user.deleted', { userId })

    res.json(createResponse({ success: true, message: 'Account permanently deleted' }))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/auth/me/export ───────────────────────────────────────────────
router.get('/me/export', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const userId = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user.id
    
    const users = await adapter.find<Record<string, any>>('users', { id: userId })
    const user = users[0] || null
    if (!user) throw new NotFoundError('User')

    // Find documents owned by the user (assuming 'author' or 'createdBy' maps to userId)
    // Note: Implementation specific to Zenith's content schema structure.
    
    const exportPayload = {
      profile: user,
      exportDate: new Date().toISOString(),
      // Add content queries here if applicable in the future
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="zenith_export_${userId}.json"`)
    res.json(exportPayload)
  } catch (err) {
    next(err)
  }
})

router.use('/', recoveryRouter)

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
    const emailResult = emailSchema.safeParse(email)
    if (!emailResult.success) throw new InvalidPayloadError('Invalid email format')

    const adapter = AdapterFactory.getActiveAdapter()
    const count = await adapter.count('users', {})
    if (count > 0) {
      throw new ForbiddenError('System is already setup. First-time registration is locked.')
    }

    const check = AuthService.validatePassword(password)
    if (!check.valid) throw new InvalidPayloadError(check.message!)

    const hashed = await AuthService.hashPassword(password)
    const user = await adapter.create<Record<string, any>>('users', {
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
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
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

router.use('/sso', ssoRouter)

export default router
