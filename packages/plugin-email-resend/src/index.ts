import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'

export const emailResendPlugin = (): ZenithPlugin => {
  return {
    id: 'email-resend',
    name: 'Resend / SMTP Email',
    description: 'Sends emails using Resend or SMTP based on configuration',
    onReady: async (ctx: PluginContext) => {
      ctx.logger.info('[Email Plugin] Listening for email:send events...')
      const core = require('@zenith-open/zenithcms-core')
      if (core && core.eventHub) {
        core.eventHub.on('email:send', async (payload: any) => {
          ctx.logger.info({ to: payload.to }, 'Email Plugin intercepted send request')
          // Implementation of resend.emails.send() or nodemailer transporter.sendMail()
        })
      }
    }
  }
}