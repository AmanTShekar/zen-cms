import { z } from 'zod';
import { FieldConfig } from '@zenith/types';

export function createZodSchema(fields: FieldConfig[], config?: unknown) {
  const shape: Record<string, unknown> = {};

  fields.forEach((field) => {
    let schema: unknown;

    switch (field.type) {
      // --- String-based types ---
      case 'text':
      case 'richtext':
      case 'json':
        schema = z.string();
        break;

      case 'email':
        schema = z.string().email();
        break;

      case 'textarea':
        schema = z.string();
        break;

      // --- Number ---
      case 'number':
        schema = z.number();
        break;

      // --- Boolean ---
      case 'checkbox':
      case 'boolean' as unknown:
        schema = z.boolean();
        break;

      // --- Date ---
      case 'date':
        schema = z.union([
          z.date(),
          z.string().transform((v) => new Date(v)),
        ]);
        break;

      // --- Media ---
      case 'media':
        schema = z.object({
          url: z.string(),
          id: z.string(),
          alt: z.string().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
        });
        if (field.hasMany) schema = z.array(schema);
        break;

      // --- Select ---
      case 'select': {
        const rawOptions = (field.options || []).map((o: unknown) =>
          typeof o === 'string' ? o : o.value
        );
        if (rawOptions.length > 0) {
          const enumSchema = z.enum(rawOptions as [string, ...string[]]);
          schema = field.hasMany ? z.array(enumSchema) : enumSchema;
        } else {
          schema = field.hasMany ? z.array(z.string()) : z.string();
        }
        break;
      }

      // --- Array of sub-fields ---
      case 'array':
        if (field.fields && field.fields.length > 0) {
          schema = z.array(createZodSchema(field.fields));
        } else {
          schema = z.array(z.any());
        }
        break;

      // --- Group (nested object) ---
      case 'group':
        if (field.fields && field.fields.length > 0) {
          schema = createZodSchema(field.fields);
        } else {
          schema = z.record(z.any());
        }
        break;

      // --- Tabs (flattened into fields) ---
      case 'tabs':
        if (field.tabs && field.tabs.length > 0) {
          const tabShape: Record<string, unknown> = {};
          field.tabs.forEach((tab: unknown) => {
            const tabSchema = createZodSchema(tab.fields);
            Object.assign(tabShape, tabSchema.shape);
          });
          schema = z.object(tabShape);
        } else {
          schema = z.record(z.any());
        }
        break;

      // --- Relation (ID reference) ---
      // --- Blocks (Discriminated Union) ---
      case 'blocks':
        if (field.blocks && field.blocks.length > 0) {
          const blockSchemas = field.blocks.map((block: unknown) => {
            const blockShape = createZodSchema(block.fields).shape;
            return z.object({
              blockType: z.literal(block.slug),
              ...blockShape,
            });
          });
          schema = z.array(z.union(blockSchemas as unknown));
        } else {
          schema = z.array(z.record(z.any()));
        }
        break;

      default:
        schema = z.any();
    }

    // Make optional unless required
    if (!field.required) {
      schema = schema.optional().nullable();
    }

    // Handle i18n
    if (field.localized) {
      schema = z.record(z.string(), schema);
    }

    // Handle Custom Validation
    if (field.hooks?.validate) {
      const validateFn = field.hooks.validate;
      schema = schema.refine(async (val: unknown) => {
        const result = await validateFn(val, {}); // Context available in next version
        return result === true;
      }, {
        message: 'Custom validation failed'
      });
    }

    shape[field.name] = schema;
  });

  // System Fields
  if (config?.drafts) {
    shape._status = z.enum(['draft', 'published']).optional();
  }
  if (config?.scheduling) {
    shape.scheduledAt = z.union([
      z.date(),
      z.string().transform((v) => new Date(v)),
    ]).optional().nullable();
  }

  return z.object(shape);
}
