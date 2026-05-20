import { Request, Response } from 'express'
import { AuthService } from '../../services/auth'
import { AdapterFactory } from '../../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../../database/adapters/BaseAdapter'
import { createResponse, createErrorResponse } from '../utils'
import { logger } from '../../services/logger'

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const userDoc = await adapter.findOne<any>('users', { email: email.toLowerCase() })

    if (!userDoc || !(await AuthService.comparePassword(password, userDoc.password))) {
      return res.status(401).json(createErrorResponse(401, 'Invalid credentials'))
    }

    const userPayload = { id: userDoc._id.toString(), email: userDoc.email, role: userDoc.role }
    const accessToken = AuthService.generateToken(userPayload)
    const refreshToken = AuthService.generateRefreshToken(userPayload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json(createResponse({ user: userPayload, accessToken }))
  } catch (_error: unknown) {
    res.status(500).json(createErrorResponse(500, 'Login failed'))
  }
}

export const logout = (req: Request, res: Response) => {
  res.clearCookie('refreshToken')
  res.json(createResponse({ success: true }))
}

export const getMe = async (req: Request, res: Response) => {
  const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
  const user = await adapter.findOne<any>('users', { _id: (req as any).user.id })
  if (user) {
    delete user.password
  }
  res.json(createResponse(user))
}
