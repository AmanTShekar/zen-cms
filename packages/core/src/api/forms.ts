import { Router, Request, Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { FormModel } from '../database/form-model'
import { FormSubmissionModel } from '../database/form-submission-model'
import { logger } from '../services/logger'

export const formsRouter: Router = Router()

// GET /api/v1/forms (List forms for admin)
formsRouter.get('/', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing site ID' })
    const forms = await FormModel.find({ siteId }).sort({ createdAt: -1 })
    res.json({ data: forms })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/forms (Create form)
formsRouter.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing site ID' })
    const form = await FormModel.create({ ...req.body, siteId })
    res.status(201).json({ data: form })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/forms/:id (Get form details for admin)
formsRouter.get('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing site ID' })
    const form = await FormModel.findOne({ _id: req.params.id, siteId })
    if (!form) return res.status(404).json({ error: 'Form not found' })
    res.json({ data: form })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/forms/:id (Update form)
formsRouter.patch('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing site ID' })
    const form = await FormModel.findOneAndUpdate({ _id: req.params.id, siteId }, req.body, { new: true })
    if (!form) return res.status(404).json({ error: 'Form not found' })
    res.json({ data: form })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/forms/:id (Delete form)
formsRouter.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing site ID' })
    const form = await FormModel.findOneAndDelete({ _id: req.params.id, siteId })
    if (form) {
      // Delete all related submissions too
      await FormSubmissionModel.deleteMany({ formId: req.params.id, siteId })
    }
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// ── SUBMISSIONS ─────────────────────────────────────────────────────────────

// GET /api/v1/forms/:id/submissions (Admin list submissions)
formsRouter.get('/:id/submissions', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing site ID' })
    const submissions = await FormSubmissionModel.find({ formId: req.params.id, siteId }).sort({ createdAt: -1 })
    res.json({ data: submissions })
  } catch (err) {
    next(err)
  }
})

// ── PUBLIC ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/v1/forms/public/:slug (Public schema retrieval)
formsRouter.get('/public/:slug', async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing site ID' })
    
    const form = await FormModel.findOne({ slug: req.params.slug, siteId })
    if (!form) return res.status(404).json({ error: 'Form not found' })
    
    // Only return safe public data (fields, submit settings)
    res.json({
      data: {
        id: form._id,
        name: form.name,
        slug: form.slug,
        description: form.description,
        fields: form.fields,
        submitSettings: {
          successMessage: form.submitSettings.successMessage,
          paymentRequired: form.submitSettings.paymentRequired,
          paymentAmount: form.submitSettings.paymentAmount,
        }
      }
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/forms/public/:slug/submit (Public submission endpoint)
formsRouter.post('/public/:slug/submit', async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing site ID' })
    
    const form = await FormModel.findOne({ slug: req.params.slug, siteId })
    if (!form) return res.status(404).json({ error: 'Form not found' })
    
    const data = req.body
    
    // 1. Validate data against form fields
    const errors: string[] = []
    form.fields.forEach((field: any) => {
      if (field.required && !data[field.name]) {
        errors.push(`${field.label} is required`)
      }
    })
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors })

    // Fetch site settings to get active payment keys & resend key
    const { AdapterFactory } = await import('../database/adapters/AdapterFactory')
    const adapter = AdapterFactory.getActiveAdapter()
    const settings = await adapter.findOne<Record<string, any>>('z_settings', { siteId })
    const site = await adapter.findOne<Record<string, any>>('z_sites', { _id: siteId })

    // 2. Process payments
    let paymentStatus: string | undefined = undefined
    let paymentProvider: string | undefined = undefined
    let paymentUrl: string | undefined = undefined

    if (form.submitSettings.paymentRequired && site?.billingEnabled) {
      paymentStatus = 'pending'
      paymentProvider = site.paymentProvider || 'stripe'
      
      const amount = form.submitSettings.paymentAmount || 0
      const currency = site.currency || 'USD'

      if (paymentProvider === 'stripe' && site.stripeSecretKey) {
        try {
          const { eventHub } = await import('../services/event-hub')
          const payload = {
            secretKey: site.stripeSecretKey,
            amount,
            currency: currency.toLowerCase(),
            name: form.name,
            successUrl: `${form.submitSettings.redirectUrl || 'http://localhost:5173/success'}?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${form.submitSettings.redirectUrl || 'http://localhost:5173/cancel'}`,
            response: { url: undefined, sessionId: undefined, error: undefined }
          }
          await eventHub.emit('payment:checkout:create', payload)
          
          if (payload.response.error) {
            throw new Error(payload.response.error)
          }
          paymentUrl = payload.response.url || undefined
        } catch (e: any) {
          logger.error('Stripe initialization failed', e)
          return res.status(500).json({ error: 'Payment gateway error', details: e.message })
        }
      } else if (paymentProvider === 'paypal' && site.paypalClientId && site.paypalClientSecret) {
        // Basic stub for PayPal Orders API
        paymentUrl = `https://www.paypal.com/checkoutnow?token=STUB_${Date.now()}`
      }
    }

    // 3. Save submission
    const submission = await FormSubmissionModel.create({
      formId: form._id,
      siteId,
      data,
      status: paymentUrl ? 'pending' : 'completed',
      paymentStatus,
      paymentProvider,
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    })

    // 4. Send email notification via EventHub
    if (form.submitSettings.sendEmailNotification && form.submitSettings.notificationEmail) {
      try {
        const { eventHub } = await import('../services/event-hub')
        eventHub.emit('email:send', {
          options: {
            from: settings?.smtpFrom || 'noreply@zenithcms.com',
            to: form.submitSettings.notificationEmail,
            subject: `New submission for ${form.name}`,
            html: `<h2>New Form Submission</h2><pre>${JSON.stringify(data, null, 2)}</pre><p>View details in Zenith CMS.</p>`
          },
          siteId
        })
      } catch (e: any) {
        logger.error({ err: e.message || String(e) }, 'Failed to dispatch email notification event')
      }
    }

    res.json({ 
      success: true, 
      message: form.submitSettings.successMessage, 
      submissionId: submission._id,
      paymentUrl
    })
  } catch (err) {
    next(err)
  }
})
