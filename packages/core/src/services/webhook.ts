import crypto from 'crypto';
import { logger } from './logger';
import { WebhookDeliveryModel } from '../database/webhook-model';

export interface WebhookTarget {
  url: string;
  secret: string;
  events: string[];
}

export interface WebhookPayload {
  event: string;
  collection?: string;
  data: any;
  timestamp: string;
}

/**
 * ZENITH NEURAL BRIDGE: WEBHOOK DISPATCHER
 * ───────────────────────────────────────
 * Orchestrates event-driven communication between the Zenith kernel and 
 * external administrative nodes (Zapier, Make, custom APIs).
 * 
 * FEATURES:
 * 1. HMAC Cryptographic Handshakes: Secures the delivery path.
 * 2. Exponential Backoff: Automated retries for network resilience.
 * 3. Delivery Auditing: Full persistence of success/failure states.
 */
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 3000, 10000]; // exponential-style backoff

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const WebhookService = {
  signPayload(payload: string, secret: string): string {
    return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  },

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.signPayload(payload, secret);
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  },

  async sendWebhook(
    target: WebhookTarget,
    event: string,
    data: any,
    collection?: string,
  ): Promise<{ success: boolean; status?: number; error?: string }> {
    const webhookPayload: WebhookPayload = {
      event,
      collection,
      data,
      timestamp: new Date().toISOString(),
    };

    const body = JSON.stringify(webhookPayload);
    const signature = this.signPayload(body, target.secret);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(target.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Zenith-Signature': signature,
            'X-Zenith-Event': event,
            'X-Zenith-Delivery': crypto.randomUUID(),
          },
          body,
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          logger.info({ url: target.url, event, attempt: attempt + 1 }, 'Webhook delivered');
          
          await WebhookDeliveryModel.create({
            collectionSlug: collection,
            event,
            url: target.url,
            success: true,
            responseStatus: response.status,
            timestamp: new Date()
          }).catch(() => {});

          return { success: true, status: response.status };
        }

        logger.warn({ url: target.url, status: response.status, attempt: attempt + 1 }, 'Webhook delivery failed, retrying');
      } catch (error: any) {
        logger.error({ url: target.url, error: error.message, attempt: attempt + 1 }, 'Webhook network error');
      }

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }

    // Final result logging to DB
    try {
      await WebhookDeliveryModel.create({
        collectionSlug: collection,
        event,
        url: target.url,
        payload: data,
        success: false,
        timestamp: new Date()
      });
    } catch (err) {
      logger.error('Failed to log webhook delivery');
    }

    logger.error({ url: target.url, event }, 'Webhook failed after all retries');
    return { success: false, error: 'Max retries exceeded' };
  },

  async dispatchEvent(
    targets: WebhookTarget[],
    event: string,
    data: any,
    collection?: string,
  ) {
    const eligible = targets.filter(t => t.events.includes(event) || t.events.includes('*'));
    // Fire-and-forget: don't block the response
    eligible.forEach(target => {
      this.sendWebhook(target, event, data, collection).catch(err =>
        logger.error({ err }, 'Unhandled webhook error')
      );
    });
  }
};
