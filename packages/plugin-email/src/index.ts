import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'
import { Resend } from 'resend'
import nodemailer from 'nodemailer'

export interface EmailPluginConfig {
  defaultFrom?: string
  resendKey?: string
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPass?: string
}

export const emailEnginePlugin = (config?: EmailPluginConfig): ZenithPlugin => {
  return {
    id: 'email-engine',
    name: 'Email Engine',
    description: 'Handles email delivery via SMTP or Resend.',
    apply: () => {},
    onReady: async (ctx: PluginContext) => {
      
      const resolveConfig = async (overrideSettings?: Record<string, any>, siteId?: string) => {
        const activeConfig = {
          resendKey: process.env.RESEND_API_KEY || config?.resendKey,
          smtpHost: process.env.SMTP_HOST || config?.smtpHost,
          smtpPort: parseInt(process.env.SMTP_PORT || '') || config?.smtpPort || 587,
          smtpUser: process.env.SMTP_USER || config?.smtpUser,
          smtpPass: process.env.SMTP_PASS || config?.smtpPass,
          fromEmail: process.env.EMAIL_FROM || config?.defaultFrom || 'Zenith CMS <noreply@zenith.local>'
        }
        
        if (overrideSettings) {
          if (overrideSettings.smtpHost) activeConfig.smtpHost = overrideSettings.smtpHost
          if (overrideSettings.smtpPort) activeConfig.smtpPort = overrideSettings.smtpPort
          if (overrideSettings.smtpUser) activeConfig.smtpUser = overrideSettings.smtpUser
          if (overrideSettings.smtpPass && overrideSettings.smtpPass !== '[MASKED_CREDENTIAL]') activeConfig.smtpPass = overrideSettings.smtpPass
          if (overrideSettings.fromEmail) activeConfig.fromEmail = overrideSettings.fromEmail
          return activeConfig
        }

        try {
          const adapter = ctx.adapter as any
          if (adapter && adapter.findOne) {
            const query = siteId ? { siteId } : {}
            const settings = await adapter.findOne('z_settings', query)
            if (settings) {
              if (settings.smtpHost) activeConfig.smtpHost = settings.smtpHost
              if (settings.smtpPort) activeConfig.smtpPort = settings.smtpPort
              if (settings.smtpUser) activeConfig.smtpUser = settings.smtpUser
              if (settings.smtpPass && settings.smtpPass !== '[MASKED_CREDENTIAL]') activeConfig.smtpPass = settings.smtpPass
              if (settings.fromEmail) activeConfig.fromEmail = settings.fromEmail
              if (settings.resendKey && settings.resendKey !== '[MASKED_CREDENTIAL]') activeConfig.resendKey = settings.resendKey
            }
          }
        } catch (e) {
          ctx.logger.warn('[Email Plugin] Failed to load email config from database settings')
        }
        return activeConfig
      }

      const anyCtx = ctx as any
      if (anyCtx.eventHub) {
        anyCtx.eventHub.on('email:send', async (payload: any) => {
          const { options, overrideSettings, siteId } = payload
          const activeConfig = await resolveConfig(overrideSettings, siteId)
          
          const from = options.from || activeConfig.fromEmail
          const to = Array.isArray(options.to) ? options.to : [options.to]

          // 1. Try SMTP if configured
          if (activeConfig.smtpHost) {
            try {
              const transporter = nodemailer.createTransport({
                host: activeConfig.smtpHost,
                port: activeConfig.smtpPort,
                secure: activeConfig.smtpPort === 465,
                auth: (activeConfig.smtpUser && activeConfig.smtpPass) ? {
                  user: activeConfig.smtpUser,
                  pass: activeConfig.smtpPass
                } : undefined
              })
              await transporter.sendMail({
                from,
                to,
                subject: options.subject,
                html: options.html,
                text: options.text,
              })
              ctx.logger.info(`[Email Plugin] Sent via SMTP to ${to.join(',')}`)
              return
            } catch (err: any) {
              ctx.logger.error(`[Email Plugin] SMTP failed: ${err.message}`)
            }
          }

          // 2. Try Resend if configured
          if (activeConfig.resendKey) {
            try {
              const client = new Resend(activeConfig.resendKey)
              await client.emails.send({
                from,
                to,
                subject: options.subject,
                html: options.html,
                text: options.text,
              })
              ctx.logger.info(`[Email Plugin] Sent via Resend to ${to.join(',')}`)
              return
            } catch (err: any) {
              ctx.logger.error(`[Email Plugin] Resend failed: ${err.message}`)
            }
          }

          ctx.logger.warn('[Email Plugin] No valid SMTP or Resend config found to dispatch email.')
        })
      }

      ctx.logger.info('[Email Plugin] Initialized and listening for email events.')
    }
  }
}
