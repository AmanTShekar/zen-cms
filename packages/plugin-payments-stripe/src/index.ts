import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'
import Stripe from 'stripe'

export const stripePlugin = (): ZenithPlugin => {
  return {
    id: 'payments-stripe',
    name: 'Stripe Payments',
    description: 'Handles Stripe checkout sessions and webhooks',
    apply: () => {},
    onReady: async (ctx: PluginContext) => {
      const anyCtx = ctx as any
      if (anyCtx.eventHub) {
        anyCtx.eventHub.on('payment:checkout:create', async (payload: any) => {
          const { siteId, secretKey, amount, currency, successUrl, cancelUrl, metadata } = payload
          
          if (!secretKey) {
            ctx.logger.error('[Stripe Plugin] Missing secret key for checkout')
            return { error: 'Missing Stripe Secret Key' }
          }

          try {
            const stripe = new Stripe(secretKey)
            const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              line_items: [
                {
                  price_data: {
                    currency: currency || 'usd',
                    product_data: {
                      name: 'Form Submission Payment',
                    },
                    unit_amount: amount * 100, // Stripe expects cents
                  },
                  quantity: 1,
                },
              ],
              mode: 'payment',
              success_url: successUrl,
              cancel_url: cancelUrl,
              metadata,
            })
            
            ctx.logger.info({ sessionId: session.id }, '[Stripe Plugin] Created Checkout Session')
            return { url: session.url, sessionId: session.id }
          } catch (err: any) {
            ctx.logger.error({ err: err.message }, '[Stripe Plugin] Failed to create checkout session')
            return { error: err.message }
          }
        })
      }
      ctx.logger.info('[Stripe Plugin] Initialized and listening for payment events.')
    }
  }
}