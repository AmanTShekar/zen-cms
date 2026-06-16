import { z } from 'zod'
import { FieldConfig } from '@zenith-open/zenithcms-types'
import { createZodSchema } from './validation'

const schemaCache = new Map<string, z.ZodObject<Record<string, any>>>()

/**
 * Returns a cached, pre-compiled Zod schema for maximum CPU and validation throughput.
 * Bypasses real-time AST building and recursive traversals.
 */
export function getCompiledZodSchema(fields: FieldConfig[], config?: any): z.ZodObject<Record<string, any>> {
  const cacheKey = config?.slug
    ? `${config.slug}:${JSON.stringify(config.drafts || false)}:${JSON.stringify(config.scheduling || false)}:${fields.map((f) => `${f.name}-${f.type}-${(f as any).required}`).join(',')}`
    : ''

  if (cacheKey && schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!
  }

  const schema = createZodSchema(fields, config)

  if (cacheKey) {
    schemaCache.set(cacheKey, schema)
  }

  return schema
}

/** Clears the Zod schema cache (e.g. when Visual Schema Architect schema undergoes changes) */
export function clearSchemaCache() {
  schemaCache.clear()
}
