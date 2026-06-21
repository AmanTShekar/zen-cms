import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { AdapterFactory } from '../../database/adapters/AdapterFactory'
import { AuthService, ADMIN_URL } from '../../services/auth'
import { EmailService } from '../../services/email'
import { redisService } from '../../services/redis'
import { createResponse } from '../../api/utils'
import { AuthenticationError, InvalidPayloadError } from '../../errors'
import { logger } from '../../services/logger'
import { env } from '../../config/env';


/**
 * OAuth Strategy — GitHub & Google
 * ─────────────────────────────────
 * Implements authorization-code flow for GitHub and Google OAuth.
 *
 * Environment variables required:
 *   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 *   OAUTH_CALLBACK_BASE_URL (defaults to ADMIN_URL)
 *
 * Flow:
 *   1. Client calls POST /auth/oauth/:provider → receives authorization URL
 *   2. User authorizes on provider page
 *   3. Provider redirects to GET /auth/oauth/:provider/callback?code=...
 *   4. Server exchanges code for access token, fetches profile, creates/links user
 *   5. Returns JWT tokens via httpOnly cookies
 */

interface OAuthConfig {
  clientId: string
  clientSecret: string
  authorizeUrl: string
  tokenUrl: string
  profileUrl: string
  scope: string
}

const OAUTH_PROVIDERS: Record<string, (baseUrl: string) => OAuthConfig> = {
  github: (baseUrl: string) => ({
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    profileUrl: 'https://api.github.com/user',
    scope: 'user:email',
  }),
  google: (baseUrl: string) => ({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile',
  }),
}

function getCallbackUrl(provider: string): string {
  const base = process.env.OAUTH_CALLBACK_BASE_URL || env.ADMIN_URL || 'http://localhost:3000'
  return `${base}/api/v1/auth/oauth/${provider}/callback`
}

function generateState(): string {
  return crypto.randomBytes(32).toString('hex')
}

async function saveState(key: string, provider: string): Promise<void> {
  const val = JSON.stringify({ provider, createdAt: Date.now() })
  // TTL 10 minutes — matches OAuth state expiry
  if (redisService.client) {
    await redisService.client.setex(`oauth:state:${key}`, 600, val)
  } else {
    logger.warn('Redis unavailable — OAuth state not persisted across instances')
  }
}

async function getAndDeleteState(key: string): Promise<{ provider: string } | null> {
  if (!redisService.client) {
    // Fallback to empty — auth will reject at state check
    return null
  }
  const raw = await redisService.client.get(`oauth:state:${key}`)
  if (!raw) return null
  await redisService.client.del(`oauth:state:${key}`) // single-use
  try {
    return JSON.parse(raw) as { provider: string }
  } catch {
    return null
  }
}

export function createOAuthRouter(): Router {
  const router: Router = Router()

  // ── POST /api/v1/auth/oauth/:provider — Initiate OAuth flow ────────────────
  router.post('/:provider', async (req: Request, res: Response, next) => {
    try {
      const { provider } = req.params
      const configFactory = OAUTH_PROVIDERS[provider]
      if (!configFactory) throw new InvalidPayloadError(`Unsupported OAuth provider: ${provider}`)

      const config = configFactory(getCallbackUrl(provider))
      if (!config.clientId || !config.clientSecret) {
        throw new InvalidPayloadError(`OAuth provider "${provider}" is not configured. Set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET.`)
      }

      const state = generateState()
      await saveState(state, provider)

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: getCallbackUrl(provider),
        scope: config.scope,
        state,
        response_type: 'code',
      })

      // Google-specific: request offline access for refresh tokens
      if (provider === 'google') {
        params.set('access_type', 'offline')
        params.set('prompt', 'consent')
      }

      const authorizeUrl = `${config.authorizeUrl}?${params.toString()}`
      res.json(createResponse({ authorizeUrl, state }))
    } catch (err) {
      next(err)
    }
  })

  // ── GET /api/v1/auth/oauth/:provider/callback — OAuth callback ─────────────
  router.get('/:provider/callback', async (req: Request, res: Response, next) => {
    try {
      const { provider } = req.params
      const { code, state, error } = req.query as Record<string, string>

      if (error) throw new AuthenticationError(`OAuth provider error: ${error}`)
      if (!code) throw new InvalidPayloadError('Authorization code is required')
      const stateData = await getAndDeleteState(state)
      if (!stateData) throw new AuthenticationError('Invalid or expired OAuth state')
      const storedProvider = stateData.provider
      if (storedProvider !== provider) throw new AuthenticationError('OAuth state provider mismatch')

      const configFactory = OAUTH_PROVIDERS[provider]
      if (!configFactory) throw new InvalidPayloadError(`Unsupported OAuth provider: ${provider}`)
      const config = configFactory(getCallbackUrl(provider))

      // Exchange authorization code for access token
      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: getCallbackUrl(provider),
          grant_type: 'authorization_code',
        }),
      })

      const tokenData = await tokenResponse.json() as any
      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new AuthenticationError(`Failed to exchange OAuth code: ${tokenData.error_description || tokenData.error || 'Unknown error'}`)
      }

      // Fetch user profile
      const profileResponse = await fetch(config.profileUrl, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      })

      const profile = await profileResponse.json() as any
      if (!profileResponse.ok) {
        throw new AuthenticationError('Failed to fetch OAuth profile')
      }

      // Extract email and name from provider-specific profile format
      const email = provider === 'github'
        ? (profile.email || `${profile.login}@users.noreply.github.com`)
        : profile.email

      const displayName = provider === 'github'
        ? (profile.name || profile.login)
        : (profile.name || email.split('@')[0])

      if (!email) throw new AuthenticationError('OAuth provider did not return an email address')

      const adapter = AdapterFactory.getActiveAdapter()

      // Check if user already exists (linked by email)
      const existingUsers = await adapter.find<Record<string, any>>('users', { email: email.toLowerCase() })
      const existingUser = existingUsers[0] || null

      let userId: string
      let userEmail: string
      let userRole: string

      if (existingUser) {
        // Link OAuth to existing account
        userId = (existingUser.id || existingUser._id).toString()
        userEmail = existingUser.email
        userRole = existingUser.role

        // Store OAuth provider link
        const oauthLinks = existingUser.oauthProviders || {}
        oauthLinks[provider] = { id: profile.id?.toString() || profile.sub, email }
        await adapter.update('users', userId, { oauthLinks })
      } else {
        // Create new user from OAuth profile
        const randomPassword = crypto.randomBytes(32).toString('base64url')
        const hashedPassword = await AuthService.hashPassword(randomPassword)

        const newUser = await adapter.create<Record<string, any>>('users', {
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'editor',
          emailVerified: true, // OAuth emails are verified by the provider
          displayName,
          oauthProviders: {
            [provider]: { id: profile.id?.toString() || profile.sub, email },
          },
        })

        userId = (newUser.id || newUser._id).toString()
        userEmail = newUser.email
        userRole = newUser.role

        // Send welcome email
        try {
          const siteId = req.headers['x-zenith-site-id'] as string | undefined
          await EmailService.sendWelcomeEmail(userEmail, displayName, siteId)
        } catch {
          // Non-fatal
        }
      }

      // Generate JWT tokens
      const payload = { id: userId, email: userEmail, role: userRole as any }
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

      // Redirect to admin with success indicator
      res.redirect(`${ADMIN_URL}/login?oauth=success`)
    } catch (err) {
      // On error, redirect to login with error
      res.redirect(`${ADMIN_URL}/login?oauth=error&message=${encodeURIComponent((err as Error).message)}`)
    }
  })

  return router
}
