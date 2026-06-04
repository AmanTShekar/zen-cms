import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { BlockDefinition } from '@zenithcms/types'
import { NotFoundError } from '../errors'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'

const router: Router = Router()

// NOTE: Block definitions are read-only catalogue data — no auth required for GET.
// Future write endpoints (POST/PUT/DELETE) should add requireAuth individually.

// Define schema recursively to support nested fields
const baseFieldSchema = z.object({
  name: z.string().optional(), // optional for some structural fields like row
  type: z.string(),
  label: z.string().optional(),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.any().optional(),
  description: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  relationTo: z.string().optional(),
  hasMany: z.boolean().optional(),
  // Validation
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  regex: z.string().optional(),
  dateFormat: z.string().optional(),
  // Admin & Layout
  admin: z.object({
    width: z.string().optional(),
    placeholder: z.string().optional(),
    hidden: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    condition: z.any().optional() // Storing as JSON for simplicity
  }).optional(),
  i18n: z.boolean().optional()
}).passthrough()

type FieldType = z.infer<typeof baseFieldSchema> & { fields?: FieldType[] }
const FieldSchema: z.ZodType<FieldType> = baseFieldSchema.extend({
  fields: z.lazy(() => FieldSchema.array().optional())
})

const BlockPayloadSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional().default('General'),
  icon: z.string().optional().default('Box'),
  fields: z.array(FieldSchema)
})

// ── GET /api/v1/blocks — List all available block definitions ─────────────
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = req.app.get('zenith_engine')?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    let dbBlocks: any[] = []
    
    if (adapter) {
      try {
        const allDbBlocks = await adapter.find('z_schemas', { type: 'block' })
        dbBlocks = allDbBlocks.filter((b: any) => !b.siteId || b.siteId === siteId)
      } catch (err) {
        // If z_schemas doesn't exist yet or is empty, gracefully fallback
        console.warn('Could not fetch from z_schemas', err)
      }
    }

    const generated = dbBlocks.map(b => ({
      ...b,
      isGenerated: true,
      filename: `${b.slug}.ts`
    }))

    res.json({ data: generated })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/blocks/:slug — Get a single block definition ─────────────
router.get('/:slug', async (req: Request, res: Response, next) => {
  try {
    const adapter = req.app.get('zenith_engine')?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    let dbBlocks: any[] = []

    if (adapter) {
      try {
        const allDbBlocks = await adapter.find('z_schemas', { type: 'block' })
        dbBlocks = allDbBlocks.filter((b: any) => !b.siteId || b.siteId === siteId)
      } catch (err) {
        console.warn('Could not fetch from z_schemas', err)
      }
    }

    const generated = dbBlocks.map(b => ({
      ...b,
      isGenerated: true,
      filename: `${b.slug}.ts`
    }))

    const block = generated.find((b) => b.slug === req.params.slug)
    
    if (!block) {
      throw new NotFoundError('Block', req.params.slug)
    }
    
    res.json({ data: block })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/blocks/generate ─────────────
router.post('/generate', async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    // siteId is optional. If missing, it generates a global block.

    const data = BlockPayloadSchema.parse(req.body)
    const blocksDir = path.resolve(__dirname, '../../../../config/blocks') // root/config/blocks
    
    if (!fs.existsSync(blocksDir)) {
      fs.mkdirSync(blocksDir, { recursive: true })
    }

    // 1. Resolve database adapter cleanly (no silent fallback)
    const adapter = req.app.get('zenith_engine')?.adapter
    if (!adapter) {
      throw new Error('Database adapter could not be resolved')
    }

    const fileName = `${data.slug}.ts`
    const filePath = path.join(blocksDir, fileName)

    const generateFieldCode = (f: any, depth = 1): string => {
      const indent = '  '.repeat(depth)
      const innerIndent = '  '.repeat(depth + 1)
      
      let props = `${innerIndent}type: '${f.type}',`
      if (f.name) props += `\n${innerIndent}name: '${f.name}',`
      if (f.label) props += `\n${innerIndent}label: '${f.label}',`
      if (f.required) props += `\n${innerIndent}required: true,`
      if (f.unique) props += `\n${innerIndent}unique: true,`
      if (f.defaultValue !== undefined) {
        props += `\n${innerIndent}defaultValue: ${typeof f.defaultValue === 'string' ? `'${f.defaultValue}'` : JSON.stringify(f.defaultValue)},`
      }
      if (f.description) props += `\n${innerIndent}description: '${f.description.replace(/'/g, "\\'")}',`
      
      // Relations
      if (f.relationTo) props += `\n${innerIndent}relationTo: '${f.relationTo}',`
      if (f.hasMany) props += `\n${innerIndent}hasMany: true,`
      
      // Select Options
      if (f.options?.length) {
        props += `\n${innerIndent}options: ${JSON.stringify(f.options)},`
      }
      
      // Validation & Bounds
      if (f.min !== undefined) props += `\n${innerIndent}min: ${f.min},`
      if (f.max !== undefined) props += `\n${innerIndent}max: ${f.max},`
      if (f.minLength !== undefined) props += `\n${innerIndent}minLength: ${f.minLength},`
      if (f.maxLength !== undefined) props += `\n${innerIndent}maxLength: ${f.maxLength},`
      if (f.regex) props += `\n${innerIndent}regex: '${f.regex.replace(/'/g, "\\'")}',`
      if (f.dateFormat) props += `\n${innerIndent}dateFormat: '${f.dateFormat}',`
      
      // Localization
      if (f.i18n) props += `\n${innerIndent}i18n: true,`

      // Admin & Layout
      if (f.admin) {
        const adminProps = []
        if (f.admin.width) adminProps.push(`width: '${f.admin.width}'`)
        if (f.admin.placeholder) adminProps.push(`placeholder: '${f.admin.placeholder.replace(/'/g, "\\'")}'`)
        if (f.admin.hidden) adminProps.push(`hidden: true`)
        if (f.admin.readOnly) adminProps.push(`readOnly: true`)
        if (f.admin.condition) adminProps.push(`condition: ${JSON.stringify(f.admin.condition)}`)
        
        if (adminProps.length > 0) {
          props += `\n${innerIndent}admin: { ${adminProps.join(', ')} },`
        }
      }

      // Recursion for structural fields (Row, Collapsible, Tabs, Array, Group)
      if (f.fields && Array.isArray(f.fields) && f.fields.length > 0) {
        const nested = f.fields.map((child: any) => generateFieldCode(child, depth + 1)).join(',\n')
        props += `\n${innerIndent}fields: [\n${nested}\n${innerIndent}],`
      }

      return `${indent}{\n${props}\n${indent}}`
    }

    const fieldsCode = data.fields.map(f => generateFieldCode(f, 2)).join(',\n')

    const fileContent = `import type { BlockDefinition } from '@zenithcms/types'

// This file is auto-generated by the Zenith CMS Component Builder.
// You can freely edit this file. The GUI will sync with these changes.

export const ${data.slug.replace(/-/g, '_')}: BlockDefinition = {
  slug: '${data.slug}',
  labels: { singular: '${data.title}', plural: '${data.title}s' },
  fields: [
${fieldsCode}
  ],
  admin: { 
    category: '${data.category}', 
    icon: '${data.icon}',
    description: '${data.description || 'Generated Component'}'
  }
}
`
    // 2. Write file to disk
    try {
      fs.writeFileSync(filePath, fileContent, 'utf-8')
    } catch (fsErr) {
      throw new Error(`Failed to write file to disk: ${(fsErr as any).message}`)
    }

    // 3. Database Upsert with Rollback
    const dbPayload = {
      slug: data.slug,
      siteId: siteId || null,
      labels: { singular: data.title, plural: `${data.title}s` },
      fields: data.fields,
      admin: {
        category: data.category,
        icon: data.icon,
        description: data.description || 'Generated Component'
      }
    }

    try {
      const existing = await adapter.findOne('z_schemas', { slug: data.slug, siteId: siteId || null })
      if (existing) {
        await adapter.update('z_schemas', (existing._id || existing.id).toString(), dbPayload)
      } else {
        await adapter.create('z_schemas', dbPayload)
      }
    } catch (dbErr) {
      // Rollback: Database failed, delete the orphaned file
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath)
          console.warn(`[Rollback] Deleted orphaned file ${filePath} due to DB error.`)
        } catch (unlinkErr) {
          console.error(`CRITICAL_RECONCILIATION_ERROR: Could not delete ${filePath} after DB error.`, unlinkErr)
        }
      }
      throw new Error(`Database sync failed: ${(dbErr as any).message}`)
    }

    res.status(200).json({ success: true, message: `Block ${data.slug} generated and upserted successfully`, path: filePath })
  } catch (err) {
    console.error('Error generating block:', err)
    next(err)
  }
})

export default router
