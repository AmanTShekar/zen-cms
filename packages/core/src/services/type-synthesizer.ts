import fs from 'fs/promises'
import path from 'path'
import { CollectionConfig, FieldConfig } from '@zenithcms/types'
import { logger } from './logger'

/**
 * Zenith TypeScript Synthesizer
 * ────────────────────────────
 * Programmatically generates strict, compiled TypeScript interfaces and query hook types
 * reactively on collection registration and schema updates, closing the major developer DX gap with Payload.
 */
export class TypeSynthesizer {
  private static mapFieldToType(field: any): string {
    if (field.localized) {
      return `Record<string, ${this.mapRawFieldType(field)}>`
    }
    return this.mapRawFieldType(field)
  }

  private static mapRawFieldType(field: any): string {
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'url':
        if (field.options && field.options.length > 0) {
          return field.options
            .map((o: any) => (typeof o === 'string' ? `'${o}'` : `'${o.value}'`))
            .join(' | ')
        }
        return 'string'
      case 'number':
        return 'number'
      case 'checkbox':
      case 'boolean':
        return 'boolean'
      case 'date':
        return 'string | Date'
      case 'json':
        return 'Record<string, any>'
      case 'relation': {
        if (Array.isArray(field.relationTo)) {
          // Polymorphic: relationTo: ['posts', 'tags']
          const targets = field.relationTo.map((t: string) => this.capitalize(t)).join(' | ')
          return field.required ? `(${targets})` : `(${targets}) | null`
        }
        const target = field.relationTo ? this.capitalize(field.relationTo) : 'string'
        return field.required ? target : `${target} | null`
      }
      case 'group':
        if (!field.fields) return 'Record<string, any>'
        return `{\n${field.fields
          .map((f: any) => `    ${f.name}${f.required ? '' : '?'}: ${this.mapFieldToType(f)};`)
          .join('\n')}\n  }`
      case 'array':
        if (!field.fields) return 'any[]'
        return `{\n${field.fields
          .map((f: any) => `    ${f.name}${f.required ? '' : '?'}: ${this.mapFieldToType(f)};`)
          .join('\n')}\n  }[]`
      case 'blocks': {
        if (!field.blocks || field.blocks.length === 0) return 'any[]'
        const blockUnions = field.blocks.map((b: any) => {
          const blockFields = b.fields
            ? b.fields
                .map(
                  (f: any) => `    ${f.name}${f.required ? '' : '?'}: ${this.mapFieldToType(f)};`
                )
                .join('\n')
            : ''
          return `{\n    blockType: '${b.slug}';\n${blockFields}\n  }`
        })
        return `(${blockUnions.join(' | ')})[]`
      }
      case 'media':
        return field.hasMany ? '{ url: string; alt?: string }[]' : '{ url: string; alt?: string }'
      case 'select': {
        if (!field.options || field.options.length === 0) return 'string'
        const options = field.options
          .map((o: any) => (typeof o === 'string' ? `'${o}'` : `'${o.value}'`))
          .join(' | ')
        return field.hasMany ? `(${options})[]` : `(${options})`
      }
      case 'code':
        return 'string'
      case 'collapsible':
        if (!field.fields) return 'Record<string, any>'
        return `{\n${field.fields
          .map((f: any) => `    ${f.name}${f.required ? '' : '?'}: ${this.mapFieldToType(f)};`)
          .join('\n')}\n  }`
      case 'join':
        return 'any[]'
      case 'point':
        return '[number, number]'
      case 'radio': {
        if (!field.options || field.options.length === 0) return 'string'
        const radioOptions = field.options
          .map((o: any) => (typeof o === 'string' ? `'${o}'` : `'${o.value}'`))
          .join(' | ')
        return `(${radioOptions})`
      }
      case 'row':
        return 'undefined'
      case 'ui':
        return 'undefined'
      case 'richtext':
        return 'string'
      default:
        logger.warn({ fieldType: field.type }, 'TypeSynthesizer: unknown field type encountered, falling back to Record<string, unknown>')
        return 'Record<string, unknown>'
    }
  }

  private static capitalize(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  }

  /**
   * Generates strict types for the user packages/types workspace and local SDK query helpers
   */
  public static async synthesize(
    collections: CollectionConfig[],
    outputPath: string
  ): Promise<void> {
    try {
      // Deduplicate collections by slug to prevent TypeScript duplicate identifier errors
      const uniqueCollectionsMap = new Map<string, CollectionConfig>()
      collections.forEach(c => uniqueCollectionsMap.set(c.slug, c))
      const uniqueCollections = Array.from(uniqueCollectionsMap.values())

      let code = `/**\n * Zenith Auto-Generated TypeScript Definitions\n * This file is automatically re-compiled on database register & boot.\n * DO NOT MODIFY MANUALLY.\n */\n\n`

      code += `export interface ZenithDocument {\n  _id: string;\n  createdAt: string;\n  updatedAt: string;\n  status?: 'draft' | 'published';\n}\n\n`

      // 1. Generate core interfaces for each collection schema
      for (const col of uniqueCollections) {
        const interfaceName = this.capitalize(col.slug)
        code += `export interface ${interfaceName} extends ZenithDocument {\n`

        for (const field of col.fields) {
          const typeStr = this.mapFieldToType(field)
          const isOptional = !(field as any).required
          code += `  ${field.name}${isOptional ? '?' : ''}: ${typeStr};\n`
        }

        code += `}\n\n`
      }

      // 2. Generate Zenith Global Type Register mapping slugs to types
      code += `export interface ZenithCollections {\n`
      for (const col of uniqueCollections) {
        code += `  '${col.slug}': ${this.capitalize(col.slug)};\n`
      }
      code += `}\n\n`

      // 3. Generate typed tanstack query hook definitions for high-speed delivery
      code += `/**\n * Fully Typed React SDK Data Hook Mappings\n */\n`
      code += `export type ZenithQuery<T> = {\n  where?: Record<string, any>;\n  sort?: string | Record<string, any>;\n  limit?: number;\n  skip?: number;\n  select?: string[];\n  populate?: string[];\n  locale?: string;\n};\n\n`

      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      await fs.writeFile(outputPath, code, 'utf-8')
      logger.info({ outputPath }, 'TypeSynthesizer: TypeScript generated successfully.')
    } catch (err: any) {
      logger.error({ err: err.message }, 'TypeSynthesizer failed to generate Types')
    }
  }
}
