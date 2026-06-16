import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { createResponse } from './utils'
import { InvalidPayloadError, NotFoundError, AuthenticationError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { JWT_SECRET } from '../services/auth'

const router: import('express').Router = Router()

// JWT_SECRET imported from services/auth with production guard

// ── Register ─────────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response, next) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password) throw new InvalidPayloadError('Email and password are required')

    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const existing = await adapter.findOne<Record<string, any>>('z_members', { email })
    if (existing) throw new InvalidPayloadError('Email already registered')

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const member = await adapter.create<Record<string, any>>('z_members', { 
      email: email.toLowerCase(), 
      password: hashedPassword, 
      name,
      is_subscribed: false,
      subscription_status: 'none'
    })

    const token = jwt.sign({ id: member.id || member._id, type: 'member' }, JWT_SECRET, { expiresIn: '30d' })

    res.status(201).json(
      createResponse({
        token,
        member: {
          id: member.id || member._id,
          email: member.email,
          name: member.name,
          isSubscribed: member.is_subscribed || member.isSubscribed,
        },
      })
    )
  } catch (err) {
    next(err)
  }
})

// ── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    
    // In SQL implementations, we fetch everything. If needed, you might need adapter method to fetch hidden fields.
    // For now, adapter.findOne will fetch the password as well in generic Drizzle wrapper.
    const member = await adapter.findOne<Record<string, any>>('z_members', { email: email.toLowerCase() })

    if (!member || !member.password) {
      throw new AuthenticationError('Invalid credentials')
    }

    const isValid = await bcrypt.compare(password, member.password)
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials')
    }

    await adapter.update('z_members', (member.id || member._id).toString(), { last_login: new Date() })

    const token = jwt.sign({ id: member.id || member._id, type: 'member' }, JWT_SECRET, { expiresIn: '30d' })

    res.json(
      createResponse({
        token,
        member: {
          id: member.id || member._id,
          email: member.email,
          name: member.name,
          isSubscribed: member.is_subscribed || member.isSubscribed,
        },
      })
    )
  } catch (err) {
    next(err)
  }
})

// ── Get Me ───────────────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) throw new AuthenticationError('No token provided')

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any

    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const member = await adapter.findOne<Record<string, any>>('z_members', { id: decoded.id })
    if (!member) throw new NotFoundError('Member', decoded.id)

    // Omit password
    const { password, ...memberSafe } = member
    res.json(createResponse(memberSafe))
  } catch (err) {
    next(err)
  }
})

export default router
