/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Request, Response } from 'express'
import { AuthService } from '../../services/auth'
import { AdapterFactory } from '../../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../../database/adapters/BaseAdapter'
import { createResponse } from '../utils'
import { AuthenticationError } from '../../errors'
import { env } from '../../config/env';

export const login = async (req: Request, res: Response, next: import('express').NextFunction) => {
  try {
    const { email, password } = req.body
    if (!email || !password) throw new AuthenticationError('Email and password required')
    
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const userDoc = await adapter.findOne<Record<string, any>>('users', { email: email.toLowerCase() })

    let isLocked = false
    if (userDoc && userDoc.lockUntil) {
      isLocked = new Date(userDoc.lockUntil) > new Date()
    }

    if (!userDoc) {
      await AuthService.comparePassword(
        password || 'dummy',
        '$2b$12$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      )
      throw new AuthenticationError()
    }

    const valid = await AuthService.comparePassword(password, userDoc.password)

    if (isLocked) {
      const lockUntil = new Date(userDoc.lockUntil)
      const remainingMs = Math.max(0, lockUntil.getTime() - Date.now())
      const remainingMin = Math.ceil(remainingMs / 60000)
      throw new AuthenticationError(`Account is locked. Try again in ${remainingMin} minute(s).`)
    }

    if (!valid) {
      const attemptInfo = await AuthService.trackFailedAttempt(email.toLowerCase())
      throw new AuthenticationError(
        attemptInfo.locked
          ? 'Account locked due to too many failed attempts.'
          : `Invalid credentials. ${attemptInfo.attemptsLeft} attempt(s) remaining.`
      )
    }

    await AuthService.resetFailedAttempts(email.toLowerCase())

    const userPayload = { id: userDoc._id.toString(), email: userDoc.email, role: userDoc.role }
    const accessToken = AuthService.generateToken(userPayload)
    const refreshToken = AuthService.generateRefreshToken(userPayload)

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

    res.json(createResponse({ user: userPayload }))
  } catch (err) {
    next(err)
  }
}

export const logout = (req: Request, res: Response) => {
  res.clearCookie('refreshToken')
  res.clearCookie('accessToken')
  res.json(createResponse({ success: true }))
}

export const getMe = async (req: Request, res: Response, next: import('express').NextFunction) => {
  try {
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    // @ts-ignore: TS2532 - unresolved type from removing @ts-nocheck
    const user = await adapter.findOne<Record<string, any>>('users', { _id: (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user.id })
    if (user) {
      delete user.password
    }
    res.json(createResponse(user))
  } catch (err) {
    next(err)
  }
}
