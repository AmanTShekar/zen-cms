# Zenith Production Blueprints

Production-ready code structures to connect, consume, and secure Zenith CMS inside scalable client architectures.

---

## 🔌 1. Decoupled Dynamic Client Scoping (Node SDK / Edge Services)

When consuming Zenith CMS dynamically, configure your client to pass API credentials and target the specific tenant site workspace.

```typescript
import { createZenithClient } from '@zenithcms/sdk'

// Initialize the enterprise headless client
const cms = createZenithClient({
  baseUrl: process.env.ZENITH_CORE_API_URL || 'http://localhost:3000/api/v1',
  apiKey: process.env.ZENITH_WORKSPACE_TOKEN,
  defaultSiteId: 'site_sandbox_901a', // Sets the global workspace tenant scoping
})

/**
 * Fetch and render a dynamic workspace page
 */
export async function getStorefrontPage(slug: string) {
  try {
    const page = await cms.collections('pages').find({
      filter: {
        slug: slug,
        status: 'published',
      },
      limit: 1,
    })

    if (!page.docs.length) {
      throw new Error(`Page not found: ${slug}`)
    }

    return page.docs[0]
  } catch (error) {
    console.error('Failed to fetch storefront page payload:', error)
    return null
  }
}
```

---

## 🔒 2. HMAC Webhook Payload Verification

Zenith signs webhook payloads using a private secret key via SHA256 signatures to secure your public integration hooks.

```typescript
import crypto from 'crypto'
import { Request, Response } from 'express'

const WEBHOOK_SIGNING_SECRET = process.env.ZENITH_WEBHOOK_SECRET || 'your_secret'

/**
 * Secure Express Webhook Listener
 */
export async function handleZenithWebhook(req: Request, res: Response) {
  const signature = req.headers['x-zenith-signature'] as string

  if (!signature) {
    return res.status(401).json({ error: 'Signature token header missing' })
  }

  // Calculate matching payload signature hash
  const computedHash = crypto
    .createHmac('sha256', WEBHOOK_SIGNING_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')

  // Secure constant-time comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(computedHash, 'hex')
  )

  if (!isValid) {
    return res.status(403).json({ error: 'Invalid HMAC signature hash' })
  }

  // Safely execute mutations...
  const { event, collection, data } = req.body
  console.log(`Received secure verified event: ${event} on ${collection}`, data)

  return res.status(200).json({ received: true })
}
```

---

## ⚙️ 3. Dynamic API Request Lifecycle Hooks

Register custom database lifecycle hooks directly within collections to compute values, trigger events, or validate states.

```typescript
import { CollectionConfig } from '@zenithcms/types'

export const OrdersCollection: CollectionConfig = {
  slug: 'orders',
  name: 'Orders Ledger',
  fields: [
    { name: 'orderId', type: 'text', required: true },
    { name: 'amount', type: 'number', required: true },
    { name: 'tax', type: 'number' },
    { name: 'status', type: 'text', defaultValue: 'pending' },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Automatically calculate tax before saving
        if (operation === 'create' || operation === 'update') {
          data.tax = Number((data.amount * 0.18).toFixed(2))
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === 'create') {
          console.log(
            `Successfully persisted order ${doc.orderId}. Triggering invoicing workflow...`
          )
        }
      },
    ],
  },
}
```
