import { z } from 'zod'
import { logger } from './logger'
import { ADMIN_URL } from './auth'
import { eventHub } from './event-hub'

const recipientSchema = z.string().email().max(254)

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  text?: string
}

/**
 * Zenith Email Service (Event Emitter)
 * ─────────────────────
 * The core does NOT handle sending emails directly (to avoid nodemailer bloat).
 * Instead, this service formats emails and emits the 'email:send' event.
 * Official plugins like @zenithcms/plugin-email listen for this event.
 */
export class EmailService {
  static async send(options: EmailOptions, overrideSettings?: Record<string, any>, siteId?: string): Promise<void> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to]
    for (const addr of recipients) {
      const result = recipientSchema.safeParse(addr)
      if (!result.success) {
        logger.warn({ email: addr }, 'Invalid email recipient — skipping')
        return
      }
    }

    // Emit the event to the system. If the @zenithcms/plugin-email is installed, 
    // it will pick this up and send it via SMTP or Resend.
    eventHub.emit('email:send', {
      options,
      overrideSettings,
      siteId
    })
    
    // In dev mode, we can still print a helpful mock log so developers know an email *would* have sent.
    if (process.env.NODE_ENV !== 'production') {
      logger.info('─── EMAIL EVENT FIRED (dev mode) ───────────────────')
      logger.info(`  To:      ${options.to}`)
      logger.info(`  Subject: ${options.subject}`)
      logger.info(`  Body:    ${options.html.replace(/<[^>]+>/g, '').substring(0, 120)}...`)
      logger.info('────────────────────────────────────────────────────')
    }
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
