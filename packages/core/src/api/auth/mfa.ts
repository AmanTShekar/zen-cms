import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import * as otplibPkg from 'otplib'
const authenticator = (otplibPkg as Record<string, unknown>).authenticator || (otplibPkg as Record<string, unknown>).default?.authenticator
import QRCode from 'qrcode'
import { AdapterFactory } from '../../database/adapters/AdapterFactory'
import { AuthService, JWT_SECRET } from '../../services/auth'
import { requireAuth } from '../../middleware/auth'
import { createResponse } from '../utils'
import { InvalidPayloadError, NotFoundError, InvalidTokenError } from '../../errors'
import rateLimit from 'express-rate-limit'
import { env } from '../../config/env';


const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})

export const mfaRouter: Router = Router()

// ── POST /api/v1/auth/2fa/setup ────────────────────────────────────────────────
mfaRouter.post('/setup', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const userId = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user.id
    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<Record<string, unknown>>('users', { id: userId })
    const user = users[0] || null
    if (!user) throw new NotFoundError('User')

    const secret = authenticator.generateSecret()
    const otpauthUrl = authenticator.keyuri(user.email, 'Zenith CMS', secret)
    const qrCodeImage = await QRCode.toDataURL(otpauthUrl)

    // Store secret temporarily (user must verify to enable it)
    await adapter.update('users', userId, { twoFactorSecret: secret, twoFactorEnabled: false })

    res.json(createResponse({ secret, qrCodeImage }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/2fa/verify-setup ───────────────────────────────────────
mfaRouter.post('/verify-setup', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { token } = req.body
    if (!token) throw new InvalidPayloadError('MFA token is required')

    const userId = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user.id
    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<Record<string, unknown>>('users', { id: userId })
    const user = users[0] || null
    if (!user || !user.twoFactorSecret) throw new InvalidPayloadError('2FA setup not initiated')

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret })
    if (!isValid) throw new InvalidTokenError('Invalid 2FA token')

    await adapter.update('users', userId, { twoFactorEnabled: true })
    res.json(createResponse({ success: true, message: '2FA enabled successfully' }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/auth/2fa/verify-login ───────────────────────────────────────
mfaRouter.post('/verify-login', mfaLimiter, async (req: Request, res: Response, next) => {
  try {
    const { tempToken, token } = req.body
    if (!tempToken || !token) throw new InvalidPayloadError('tempToken and 2FA token are required')

    let decoded: Record<string, unknown>
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET, { algorithms: ['HS256'] })
      if (decoded.type !== '2fa_temp') throw new Error()
    } catch {
      throw new InvalidTokenError('Session expired or invalid')
    }

    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<Record<string, unknown>>('users', { id: decoded.id })
    const user = users[0] || null
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new InvalidPayloadError('2FA not enabled for this user')
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret })
    if (!isValid) throw new InvalidTokenError('Invalid 2FA token')

    // Reset failed attempts upon successful 2FA
    await AuthService.resetFailedAttempts(user.email)

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

    res.json(createResponse({ user: payload }))
  } catch (err) {
    next(err)
  }
})
