import { Resend } from 'resend'
import { logger } from './logger'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  text?: string
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Zenith CMS <noreply@zenith.local>'

/**
 * Zenith Email Service
 * ─────────────────────
 * Production: Uses Resend (set RESEND_API_KEY).
 * Development: Logs email to console — zero config needed.
 */
export class EmailService {
  private static client: Resend | null = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null

  static async send(options: EmailOptions): Promise<void> {
    if (this.client) {
      try {
        const to = Array.isArray(options.to) ? options.to : [options.to]
        await this.client.emails.send({
          from: options.from || FROM_ADDRESS,
          to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        })
        logger.info({ to: options.to, subject: options.subject }, 'Email sent via Resend')
      } catch (err) {
        logger.error({ err, to: options.to }, 'Resend email failed')
        // Don't throw — email failure should not break the request
      }
    } else {
      // Dev mode: pretty console log
      logger.info('─── EMAIL (dev mode) ───────────────────────────────')
      logger.info(`  To:      ${options.to}`)
      logger.info(`  Subject: ${options.subject}`)
      logger.info(`  Body:    ${options.html.replace(/<[^>]+>/g, '').substring(0, 120)}...`)
      logger.info('────────────────────────────────────────────────────')
    }
  }

  static async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.send({
      to: email,
      subject: `Welcome to Zenith CMS, ${name}!`,
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>You've been successfully added to the <strong>Zenith CMS</strong>.</p>
        <p>Log in at <a href="${process.env.ADMIN_URL || 'http://localhost:5173'}">${process.env.ADMIN_URL || 'http://localhost:5173'}</a></p>
      `,
    })
  }

  static async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
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
    })
  }
}
