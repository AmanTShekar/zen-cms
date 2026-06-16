/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { logger } from './logger'

export interface AuthStrategy {
  name: string
  displayName: string
  icon?: string
  authenticate: (payload: any) => Promise<{ success: boolean; user?: any; error?: string }>
}

export class AuthStrategyRegistry {
  private static strategies = new Map<string, AuthStrategy>()

  /**
   * Registers a dynamic authentication provider.
   */
  static registerStrategy(strategy: AuthStrategy): void {
    this.strategies.set(strategy.name, strategy)
    logger.info({ providerName: strategy.name }, '[AuthRegistry] Registered dynamic SSO strategy successfully')
  }

  /**
   * Unregisters an authentication provider.
   */
  static unregisterStrategy(name: string): void {
    if (this.strategies.has(name)) {
      this.strategies.delete(name)
      logger.info({ providerName: name }, '[AuthRegistry] Unregistered auth strategy')
    }
  }

  /**
   * Retrieves a registered auth strategy by name.
   */
  static getStrategy(name: string): AuthStrategy | undefined {
    return this.strategies.get(name)
  }

  /**
   * Lists all available SSO and OAuth providers configured in the system.
   */
  static listStrategies(): { name: string; displayName: string; icon?: string }[] {
    return Array.from(this.strategies.values()).map((s) => ({
      name: s.name,
      displayName: s.displayName,
      icon: s.icon
    }))
  }
}

import passport from 'passport'
import { MultiSamlStrategy } from '@node-saml/passport-saml'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { AdapterFactory } from '../database/adapters/AdapterFactory'

passport.use(
  new MultiSamlStrategy(
    {
      passReqToCallback: true,
      getSamlOptions: async (req, done) => {
        try {
          const adapter = AdapterFactory.getActiveAdapter()
          const settings = await adapter.findOne<Record<string, any>>('z_settings', {})
          
          if (!settings || !settings.saml) {
            // Fallback to env vars if database settings are missing
            return done(null, {
              callbackUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/sso/saml/callback',
              entryPoint: process.env.SAML_ENTRY_POINT || 'https://idp.example.com/sso/saml',
              issuer: process.env.SAML_ISSUER || 'zenith-cms',
              idpCert: process.env.SAML_CERT || 'dummy-cert'
            })
          }

          // Use dynamically loaded Enterprise SAML config from Database
          return done(null, {
            callbackUrl: settings.saml.callbackUrl,
            entryPoint: settings.saml.entryPoint,
            issuer: settings.saml.issuer,
            idpCert: settings.saml.idpCert,
          })
        } catch (err) {
          done(err as Error)
        }
      }
    },
    (req: any, profile: any, done: any) => {
      logger.info({ profile }, '[AuthRegistry] Real SAML profile received')
      if (!profile) return done(new Error('SAML profile missing'))
      
      // Map SAML assertion to Zenith User
      return done(null, {
        id: profile.nameID || profile.uid || 'sso-user',
        email: profile.email || profile.nameID,
        role: 'editor' // Enterprise mapping can be expanded here
      })
    }
  )
)

AuthStrategyRegistry.registerStrategy({
  name: 'saml',
  displayName: 'Enterprise SAML 2.0',
  icon: 'shield-check',
  authenticate: async () => {
    return { success: false, error: 'Use /api/v1/auth/sso/saml endpoint for Passport integration' }
  }
})

// Google OAuth Scaffolding
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-google-client-secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/sso/google/callback'
    },
    (accessToken: string, refreshToken: string, profile: any, done: any) => {
      logger.info({ provider: 'google', id: profile.id }, '[AuthRegistry] Google profile received')
      if (!profile) return done(new Error('Google profile missing'))
      
      return done(null, {
        id: profile.id,
        email: profile.emails?.[0]?.value || `${profile.id}@google.com`,
        role: 'editor'
      })
    }
  )
)

AuthStrategyRegistry.registerStrategy({
  name: 'google',
  displayName: 'Google Login',
  icon: 'brand-google',
  authenticate: async () => {
    return { success: false, error: 'Use /api/v1/auth/sso/google endpoint for Passport integration' }
  }
})

// GitHub OAuth Scaffolding
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || 'dummy-github-client-id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy-github-client-secret',
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/sso/github/callback'
    },
    (accessToken: string, refreshToken: string, profile: any, done: any) => {
      logger.info({ provider: 'github', id: profile.id }, '[AuthRegistry] GitHub profile received')
      if (!profile) return done(new Error('GitHub profile missing'))
      
      return done(null, {
        id: profile.id,
        email: profile.emails?.[0]?.value || `${profile.username}@github.com`,
        role: 'editor'
      })
    }
  )
)

AuthStrategyRegistry.registerStrategy({
  name: 'github',
  displayName: 'GitHub Login',
  icon: 'brand-github',
  authenticate: async () => {
    return { success: false, error: 'Use /api/v1/auth/sso/github endpoint for Passport integration' }
  }
})


