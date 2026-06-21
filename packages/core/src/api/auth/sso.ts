import express, { Request, Response, NextFunction, Router } from 'express'
import passport from 'passport'
import { AdapterFactory } from '../../database/adapters/AdapterFactory'
import { AuthService } from '../../services/auth'
import { AuthenticationError } from '../../errors'
import { env } from '../../config/env';


export const ssoRouter: Router = express.Router()

function getAdminUrl(): string {
  if (env.ADMIN_URL) return env.ADMIN_URL
  if (env.NODE_ENV === 'production') {
    throw new Error('ADMIN_URL environment variable is required in production')
  }
  return 'http://localhost:5173'
}

/**
 * Shared handler for all SSO providers to upsert user and generate Zenith tokens
 */
async function handleSsoSuccess(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = req.user as any
    if (!profile) throw new AuthenticationError('SSO authentication failed: no profile received')

    // 1. Upsert user in database
    const adapter = AdapterFactory.getActiveAdapter()
    const existing = await adapter.find<Record<string, any>>('users', { email: profile.email })
    let user = existing[0]

    if (!user) {
      user = await adapter.create<Record<string, any>>('users', {
        email: profile.email.toLowerCase(),
        password: 'sso-managed-account',
        role: profile.role || 'editor',
        ssoId: profile.id
      })
    }

    // 2. Generate Zenith Session Tokens
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

    // 3. Redirect to Admin Dashboard
    res.redirect(getAdminUrl())
  } catch (err) {
    next(err)
  }
}

// ── SAML SSO routes ──────────────────────────────────────────────────────────
ssoRouter.get('/saml', passport.authenticate('saml', { failureRedirect: '/', failureFlash: true }))
ssoRouter.post('/saml/callback', passport.authenticate('saml', { failureRedirect: '/', failureFlash: true }), handleSsoSuccess)

// ── Google SSO routes ────────────────────────────────────────────────────────
ssoRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
ssoRouter.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), handleSsoSuccess)

// ── GitHub SSO routes ────────────────────────────────────────────────────────
ssoRouter.get('/github', passport.authenticate('github', { scope: ['user:email'] }))
ssoRouter.get('/github/callback', passport.authenticate('github', { failureRedirect: '/' }), handleSsoSuccess)
