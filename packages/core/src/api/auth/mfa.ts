/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import * as otplibPkg from 'otplib'
const authenticator = (otplibPkg as Record<string, any>).authenticator || (otplibPkg as Record<string, any>).default?.authenticator
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
    // @ts-ignore: TS2532 - unresolved type from removing @ts-nocheck
    const userId = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user.id
    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<Record<string, any>>('users', { id: userId })
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

    // @ts-ignore: TS2532 - unresolved type from removing @ts-nocheck
    const userId = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user.id
    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<Record<string, any>>('users', { id: userId })
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

    let decoded: Record<string, any>
    try {
      // @ts-ignore: TS2322 - unresolved type from removing @ts-nocheck
      decoded = jwt.verify(tempToken, JWT_SECRET, { algorithms: ['HS256'] })
      if (decoded.type !== '2fa_temp') throw new Error()
    } catch {
      throw new InvalidTokenError('Session expired or invalid')
    }

    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<Record<string, any>>('users', { id: decoded.id })
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
