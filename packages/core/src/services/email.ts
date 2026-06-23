import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { logger } from './logger'
import { ADMIN_URL } from './auth'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { env } from '../config/env';


const recipientSchema = z.string().email().max(254)

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  text?: string
}

/**
 * Zenith Email Service
 * ─────────────────────
 * Production: Uses SMTP (Nodemailer) or Resend based on z_settings or env vars.
 * Development: Logs email to console if no config is found.
 */
export class EmailService {
  private static async resolveConfig(overrideSettings?: Record<string, unknown>, siteId?: string) {
    const config = {
      resendKey: env.RESEND_API_KEY,
      smtpHost: env.SMTP_HOST,
      smtpPort: env.SMTP_PORT || 587,
      smtpUser: env.SMTP_USER,
      smtpPass: env.SMTP_PASS,
      fromEmail: env.EMAIL_FROM || 'Zenith CMS <noreply@zenith.local>'
    }

    if (overrideSettings) {
      if (overrideSettings.smtpHost) config.smtpHost = overrideSettings.smtpHost
      if (overrideSettings.smtpPort) config.smtpPort = overrideSettings.smtpPort
      if (overrideSettings.smtpUser) config.smtpUser = overrideSettings.smtpUser
      if (overrideSettings.smtpPass && overrideSettings.smtpPass !== '[MASKED_CREDENTIAL]') config.smtpPass = overrideSettings.smtpPass
      if (overrideSettings.fromEmail) config.fromEmail = overrideSettings.fromEmail
      return config
    }

    try {
      const adapter = AdapterFactory.getActiveAdapter()
      if (adapter) {
        const query = siteId ? { siteId } : {}
        const settings = await adapter.findOne<Record<string, unknown>>('z_settings', query)
        if (settings) {
          if (settings.smtpHost) config.smtpHost = settings.smtpHost
          if (settings.smtpPort) config.smtpPort = settings.smtpPort
          if (settings.smtpUser) config.smtpUser = settings.smtpUser
          if (settings.smtpPass && settings.smtpPass !== '[MASKED_CREDENTIAL]') config.smtpPass = settings.smtpPass
          if (settings.fromEmail) config.fromEmail = settings.fromEmail
        }
      }
    } catch (e) {
      logger.warn('Failed to load email config from settings')
    }
    return config
  }

  static async testConnection(overrideSettings: Record<string, unknown>, siteId?: string): Promise<boolean> {
    const config = await this.resolveConfig(overrideSettings, siteId)
    if (!config.smtpHost) throw new Error('SMTP Host is required')
    
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: (config.smtpUser && config.smtpPass) ? {
        user: config.smtpUser,
        pass: config.smtpPass
      } : undefined
    })

    await transporter.verify()
    return true
  }

  static async send(options: EmailOptions, overrideSettings?: Record<string, unknown>, siteId?: string): Promise<void> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to]
    for (const addr of recipients) {
      const result = recipientSchema.safeParse(addr)
      if (!result.success) {
        logger.warn({ email: addr }, 'Invalid email recipient — skipping')
        return
      }
    }

    const config = await this.resolveConfig(overrideSettings, siteId)
    const from = options.from || config.fromEmail
    const to = recipients

    // 1. Try SMTP if configured
    if (config.smtpHost) {
      try {
        const transporter = nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpPort === 465,
          auth: (config.smtpUser && config.smtpPass) ? {
            user: config.smtpUser,
            pass: config.smtpPass
          } : undefined
        })
        await transporter.sendMail({
          from,
          to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        })
        logger.info({ to, subject: options.subject }, 'Email sent via SMTP')
        return
      } catch (err) {
        logger.error({ err, to }, 'SMTP email failed')
        // fallthrough
      }
    }

    // 2. Try Resend if configured
    if (config.resendKey) {
      try {
        const client = new Resend(config.resendKey)
        await client.emails.send({
          from,
          to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        })
        logger.info({ to, subject: options.subject }, 'Email sent via Resend')
        return
      } catch (err) {
        logger.error({ err, to }, 'Resend email failed')
      }
    }

    // 3. Dev mode: pretty console log
    logger.info('─── EMAIL (dev mode) ───────────────────────────────')
    logger.info(`  To:      ${to}`)
    logger.info(`  Subject: ${options.subject}`)
    logger.info(`  Body:    ${options.html.replace(/<[^>]+>/g, '').substring(0, 120)}...`)
    logger.info('────────────────────────────────────────────────────')
  }

  static async sendWelcomeEmail(email: string, name: string, siteId?: string): Promise<void> {
    const safeName = name.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
    await this.send({
      to: email,
      subject: `Welcome to Zenith CMS, ${safeName}!`,
      html: `
        <h1>Welcome, ${safeName}!</h1>
        <p>You've been successfully added to the <strong>Zenith CMS</strong>.</p>
        <p>Log in at <a href="${ADMIN_URL}">${ADMIN_URL}</a></p>
      `,
    }, undefined, siteId)
  }

  static async sendPasswordResetEmail(email: string, resetUrl: string, siteId?: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Reset your Zenith CMS password',
      html: `
        <h1>Password Reset</h1>
        <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <hr/>
        <small>Or copy this link: ${resetUrl}</small>
      `,
    }, undefined, siteId)
  }
}
