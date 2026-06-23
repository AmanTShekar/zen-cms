import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { AdapterFactory } from '../../database/adapters/AdapterFactory'
import { AuthService } from '../../services/auth'
import { EmailService } from '../../services/email'
import { requireAuth } from '../../middleware/auth'
import { createResponse } from '../utils'
import { InvalidPayloadError, NotFoundError, InvalidTokenError } from '../../errors'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../../config/env';


const emailSchema = z.string().email().max(254)

const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})

export const recoveryRouter: Router = Router()

function getAdminUrl(): string {
  if (env.ADMIN_URL) return env.ADMIN_URL
  if (env.NODE_ENV === 'production') {
    throw new Error('ADMIN_URL environment variable is required in production')
  }
  return 'http://localhost:5173'
}

// ── POST /api/v1/auth/forgot-password ───────────────────────────────────────
recoveryRouter.post('/forgot-password', recoveryLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email } = req.body
    if (!email) throw new InvalidPayloadError('Email is required')
    const emailResult = emailSchema.safeParse(email)
    if (!emailResult.success) throw new InvalidPayloadError('Invalid email format')

    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<Record<string, unknown>>('users', { email: email.toLowerCase() })
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

    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const resetUrl = `${getAdminUrl()}/reset-password?token=${token}`
    await EmailService.sendPasswordResetEmail(user.email, resetUrl, siteId)

    res.json(createResponse({ message: 'If that email exists, a reset link has been sent.' }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/reset-password ─────────────────────────────────────────
recoveryRouter.post('/reset-password', recoveryLimiter, async (req: Request, res: Response, next) => {
  try {
    const { token, password } = req.body
    if (!token || !password) throw new InvalidPayloadError('Token and password are required')

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const adapter = AdapterFactory.getActiveAdapter()
    const resets = await adapter.find<Record<string, unknown>>('z_password_resets', { token: tokenHash, used: false })
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
recoveryRouter.post('/verify-email', recoveryLimiter, async (req: Request, res: Response, next) => {
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
recoveryRouter.post('/resend-verification', recoveryLimiter, requireAuth, async (req: Request, res: Response, next) => {
  try {
    const userId = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user.id
    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<Record<string, unknown>>('users', { id: userId })
    const user = users[0] || null
    if (!user) throw new NotFoundError('User')
    if (user.emailVerified) {
      return res.json(createResponse({ message: 'Email is already verified.' }))
    }

    const verifyToken = await AuthService.generateVerificationToken(userId)
    const verifyUrl = `${getAdminUrl()}/verify-email?token=${verifyToken}`
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    await EmailService.send({
      to: user.email,
      subject: 'Verify your Zenith CMS email address',
      html: `<p>Please verify your email by clicking <a href="${verifyUrl}">this link</a>. It expires in 24 hours.</p>`,
    }, undefined, siteId)

    res.json(createResponse({ message: 'Verification email sent.' }))
  } catch (err) {
    next(err)
  }
})
