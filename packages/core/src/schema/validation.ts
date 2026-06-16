import { z } from 'zod'
import { FieldConfig } from '@zenith-open/zenithcms-types'
import Ajv from 'ajv'

const ajv = new Ajv({ allErrors: true })

export function createZodSchema(fields: FieldConfig[], config?: any) {
  const shape: Record<string, any> = {}

  fields.forEach((field: any) => {
    let schema: any

    switch (field.type as string) {
      // --- String-based types ---
      case 'text': {
        let s = z.string()
        if (typeof field.minLength === 'number') s = s.min(field.minLength, { message: `${field.label || field.name} must be at least ${field.minLength} characters` })
        if (typeof field.maxLength === 'number') s = s.max(field.maxLength, { message: `${field.label || field.name} must be at most ${field.maxLength} characters` })
        schema = s
        break
      }

      case 'richtext': {
        if (field.format === 'json') {
          schema = z.union([
            z.string(),
            z.record(z.any()),
            z.array(z.any())
          ])
        } else {
          let s = z.string()
          if (typeof field.minLength === 'number') s = s.min(field.minLength, { message: `${field.label || field.name} must be at least ${field.minLength} characters` })
          if (typeof field.maxLength === 'number') s = s.max(field.maxLength, { message: `${field.label || field.name} must be at most ${field.maxLength} characters` })
          schema = s
        }
        break
      }

      case 'json': {
        const jsonSchema = z.any().refine(
          (val) => {
            let parsed = val
            if (typeof val === 'string') {
              try {
                parsed = JSON.parse(val)
              } catch {
                return false
              }
            }
            if (field.jsonSchema) {
              try {
                const validate = ajv.compile(field.jsonSchema)
                return validate(parsed)
              } catch {
                return false
              }
            }
            return typeof parsed === 'object' && parsed !== null
          },
          (val) => {
            let parsed = val
            if (typeof val === 'string') {
              try {
                parsed = JSON.parse(val)
              } catch {
                return { message: `${field.label || field.name} must be a valid JSON string or object` }
              }
            }
            if (field.jsonSchema) {
              try {
                const validate = ajv.compile(field.jsonSchema)
                const valid = validate(parsed)
                if (!valid && validate.errors) {
                  const errMsgs = validate.errors.map((e) => `${e.instancePath || 'root'} ${e.message}`).join(', ')
                  return { message: `${field.label || field.name} validation failed: ${errMsgs}` }
                }
              } catch (err: any) {
                return { message: `${field.label || field.name} schema compilation failed: ${err.message}` }
              }
            }
            return { message: `${field.label || field.name} must be a valid JSON string or object` }
          }
        )
        schema = jsonSchema
        break
      }

      case 'email': {
        // RFC-5321 compliant pattern — stricter than Zod default
        const emailRegex = /^(?!.*\.\.)[\w!#$%&'*+/=?^`{|}~-](?:[\w!#$%&'*+/=?^`{|}~.-]*[\w!#$%&'*+/=?^`{|}~-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i
        schema = z.string().regex(emailRegex, { message: 'Please enter a valid email address' })
        break
      }

      case 'textarea': {
        let s = z.string()
        if (typeof field.minLength === 'number') s = s.min(field.minLength, { message: `${field.label || field.name} must be at least ${field.minLength} characters` })
        if (typeof field.maxLength === 'number') s = s.max(field.maxLength, { message: `${field.label || field.name} must be at most ${field.maxLength} characters` })
        schema = s
        break
      }

      // --- Number ---
      case 'number': {
        let s = z.number()
        if (typeof field.min === 'number') s = s.min(field.min, { message: `${field.label || field.name} must be at least ${field.min}` })
        if (typeof field.max === 'number') s = s.max(field.max, { message: `${field.label || field.name} must be at most ${field.max}` })
        schema = s
        break
      }

      // --- Boolean ---
      case 'checkbox':
      case 'boolean':
        schema = z.boolean()
        break

      // --- Date ---
      case 'date':
        schema = z.union([z.date(), z.string().transform((v) => new Date(v))])
        break

      // --- Media (MediaPicker asset objects, stored as JSONB or plain string URLs) ---
      case 'media': {
        const asset = z.union([
          z.string({ message: 'Must be a valid media string or object' }),
          z.object({
            _id: z.string().optional(),
            id: z.string().optional(),
            url: z.string({ message: 'URL is required' }),
            alt: z.string().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            mimetype: z.string().optional(),
            size: z.number().optional(),
            focalPoint: z.object({ x: z.number(), y: z.number() }).optional(),
          }).passthrough()
        ])
        schema = field.hasMany ? z.array(asset) : asset
        break
      }

      // --- Select ---
      case 'select': {
        const rawOptions = (field.options || []).map((o: any) =>
          typeof o === 'string' ? o : o.value
        )
        if (rawOptions.length > 0) {
          const enumSchema = z.enum(rawOptions as [string, ...string[]])
          schema = field.hasMany ? z.array(enumSchema) : enumSchema
        } else {
          schema = field.hasMany ? z.array(z.string()) : z.string()
        }
        break
      }

      // --- Array of sub-fields ---
      case 'array': {
        let itemSchema: z.ZodTypeAny
        if (field.fields && field.fields.length > 0) {
          itemSchema = createZodSchema(field.fields)
        } else {
          itemSchema = z.any()
        }
        let arrSchema = z.array(itemSchema)
        if (typeof field.minRows === 'number') arrSchema = arrSchema.min(field.minRows, { message: `${field.label || field.name} requires at least ${field.minRows} row(s)` })
        if (typeof field.maxRows === 'number') arrSchema = arrSchema.max(field.maxRows, { message: `${field.label || field.name} allows at most ${field.maxRows} row(s)` })
        schema = arrSchema
        break
      }

      // --- Group (nested object) ---
      case 'group':
        if (field.fields && field.fields.length > 0) {
          schema = createZodSchema(field.fields)
        } else {
          schema = z.record(z.any())
        }
        break

      // --- Tabs (flattened into fields) ---
      case 'tabs':
        if ((field as any).tabs && (field as any).tabs.length > 0) {
          const tabShape: Record<string, any> = {}
          ;(field as any).tabs.forEach((tab: any) => {
            const tabSchema = createZodSchema(tab.fields)
            Object.assign(tabShape, tabSchema.shape)
          })
          schema = z.object(tabShape)
        } else {
          schema = z.record(z.any())
        }
        break

      // --- Code (string with language hint) ---
      case 'code': {
        let s = z.string()
        if (typeof field.minLength === 'number') s = s.min(field.minLength, { message: `${field.label || field.name} must be at least ${field.minLength} characters` })
        if (typeof field.maxLength === 'number') s = s.max(field.maxLength, { message: `${field.label || field.name} must be at most ${field.maxLength} characters` })
        schema = s
        break
      }

      // --- Collapsible (nested object, same as group) ---
      case 'collapsible':
        if (field.fields && field.fields.length > 0) {
          schema = createZodSchema(field.fields)
        } else {
          schema = z.record(z.any())
        }
        break

      // --- Join (virtual read-only field) ---
      case 'join':
        schema = z.array(z.any()).optional()
        break

      // --- Point (geolocation tuple [lng, lat]) ---
      case 'point':
        schema = z.tuple([z.number(), z.number()]).optional().nullable()
        break

      // --- Radio (single-select, same validation as select) ---
      case 'radio': {
        const rawOptions = (field.options || []).map((o: any) =>
          typeof o === 'string' ? o : o.value
        )
        if (rawOptions.length > 0) {
          schema = z.enum(rawOptions as [string, ...string[]])
        } else {
          schema = z.string()
        }
        break
      }

      // --- Row (layout-only, no data stored) ---
      case 'row':
        schema = z.any().optional()
        break

      // --- UI (presentational-only, no data stored) ---
      case 'ui':
        schema = z.any().optional()
        break

      // --- Relation (ID reference) ---
      // --- Blocks (Discriminated Union) ---
      case 'blocks':
        if (field.blocks && field.blocks.length > 0) {
          const blockSchemas = field.blocks.map((blockDef: any) => {
            let block = blockDef;
            if (typeof blockDef === 'string') {
              // We cannot resolve string references synchronously without a registry
              block = undefined
            }
            if (!block) return z.any()

            const blockShape = createZodSchema(block.fields).shape
            return z.object({
              blockType: z.literal(block.slug),
              ...blockShape,
            })
          })
          schema = z.array(z.union(blockSchemas as any))
        } else {
          schema = z.array(z.record(z.any()))
        }
        break

      default:
        schema = z.any()
    }

    // Make optional unless required
    if (!field.required) {
      schema = schema.optional().nullable()
    }

    // Handle i18n
    if (field.localized) {
      schema = z.record(z.string(), schema)
    }

    // Handle Custom Validation
    if (field.hooks?.validate) {
      const validateFn = field.hooks.validate
      schema = schema.refine(
        async (val: any) => {
          const result = await validateFn(val, {}) // Context available in next version
          return result === true
        },
        {
          message: 'Custom validation failed',
        }
      )
    }

    shape[field.name] = schema
  })

  // System Fields
  if (config?.drafts) {
    shape._status = z.enum(['draft', 'published']).optional()
  }
  if (config?.scheduling) {
    shape.scheduledAt = z
      .union([z.date(), z.string().transform((v) => new Date(v))])
      .optional()
      .nullable()
  }

  // Implicitly allow spatial blocks (sections) on all collections
  // This ensures the editor's Layers panel works seamlessly without Zod stripping the payload
  shape.sections = z.array(z.any()).optional()

  return z.object(shape as any)
}
