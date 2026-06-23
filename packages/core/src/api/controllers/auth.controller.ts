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
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const userDoc = await adapter.findOne<Record<string, unknown>>('users', { email: email.toLowerCase() })

    if (!userDoc || !(await AuthService.comparePassword(password, userDoc.password))) {
      throw new AuthenticationError()
    }

    const userPayload = { id: userDoc._id.toString(), email: userDoc.email, role: userDoc.role }
    const accessToken = AuthService.generateToken(userPayload)
    const refreshToken = AuthService.generateRefreshToken(userPayload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json(createResponse({ user: userPayload, accessToken }))
  } catch (err) {
    next(err)
  }
}

export const logout = (req: Request, res: Response) => {
  res.clearCookie('refreshToken')
  res.json(createResponse({ success: true }))
}

export const getMe = async (req: Request, res: Response, next: import('express').NextFunction) => {
  try {
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const user = await adapter.findOne<Record<string, unknown>>('users', { _id: (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user.id })
    if (user) {
      delete user.password
    }
    res.json(createResponse(user))
  } catch (err) {
    next(err)
  }
}
