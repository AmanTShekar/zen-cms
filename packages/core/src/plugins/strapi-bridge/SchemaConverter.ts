import { CollectionConfig, FieldConfig } from '@zenithcms/types'
import { parseStrapiUid } from './StrapiGlobalBridge'

/**
 * Strapi-to-Zenith Schema Converter
 * ──────────────────────────────────
 * Parses Strapi content-type schema JSON objects and dynamically constructs
 * Zenith-compatible `CollectionConfig` and field configurations compiled Ahead-of-Time.
 */

export class SchemaConverter {
  /**
   * Converts a Strapi JSON schema object to a Zenith CollectionConfig object.
   */
  static convert(strapiSchema: any): CollectionConfig {
    const info = strapiSchema.info || {}
    const attributes = strapiSchema.attributes || {}
    const options = strapiSchema.options || {}

    const slug = info.singularName || info.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const name = info.displayName || info.name

    const fields: FieldConfig[] = []

    for (const [fieldName, attr] of Object.entries(attributes)) {
      const field = this.convertAttribute(fieldName, attr)
      if (field) {
        fields.push(field)
      }
    }

    return {
      name,
      slug,
      drafts: !!options.draftAndPublish,
      publicRead: true, // Default to readable in public API
      fields,
      admin: {
        useAsTitle: info.useAsTitle || 'title',
      },
    }
  }

  /**
   * Maps a single Strapi attribute config to a Zenith FieldConfig.
   */
  private static convertAttribute(name: string, attr: any): FieldConfig | null {
    const type = attr.type
    const required = !!attr.required
    const unique = !!attr.unique

    // Simple mappings
    switch (type) {
      case 'string':
      case 'enumeration':
        return {
          name,
          type: 'text',
          required,
          unique,
        } as any

      case 'text':
        return {
          name,
          type: 'textarea',
          required,
          unique,
        } as any

      case 'richtext':
        return {
          name,
          type: 'richtext',
          required,
        } as any

      case 'email':
        return {
          name,
          type: 'email',
          required,
          unique,
        } as any

      case 'integer':
      case 'biginteger':
      case 'float':
      case 'decimal':
        return {
          name,
          type: 'number',
          required,
        } as any

      case 'boolean':
        return {
          name,
          type: 'boolean',
          required,
        } as any

      case 'date':
      case 'datetime':
      case 'time':
      case 'timestamp':
        return {
          name,
          type: 'date',
          required,
        } as any

      case 'json':
        return {
          name,
          type: 'json',
          required,
        } as any

      case 'media':
        return {
          name,
          type: 'media',
          required,
        } as any

      case 'relation': {
        const relationType = attr.relation // e.g. "oneToOne", "oneToMany", "manyToOne", "manyToMany"
        const target = attr.target // e.g. "api::category.category"
        const hasMany = ['oneToMany', 'manyToMany'].includes(relationType)
        const relationTo = target ? parseStrapiUid(target) : 'media'

        return {
          name,
          type: 'relation',
          relationTo,
          hasMany,
          required,
        } as any
      }

      case 'component': {
        // A Strapi component maps to either a group or array of fields
        const repeatable = !!attr.repeatable
        const componentFields: FieldConfig[] = []

        // If the component schema has attributes, map them nestedly
        if (attr.attributes) {
          for (const [nestedName, nestedAttr] of Object.entries(attr.attributes)) {
            const nestedField = this.convertAttribute(nestedName, nestedAttr)
            if (nestedField) componentFields.push(nestedField)
          }
        }

        if (repeatable) {
          return {
            name,
            type: 'array',
            fields: componentFields,
            required,
          } as any
        } else {
          return {
            name,
            type: 'group',
            fields: componentFields,
            required,
          } as any
        }
      }

      case 'dynamiczone': {
        // Dynamic zones hold arrays of different components (blocks)
        const blocks: any[] = []

        if (Array.isArray(attr.components)) {
          attr.components.forEach((compName: string) => {
            blocks.push({
              slug: compName.split('.').pop() || compName,
              name: compName,
              fields: [], // Will be dynamically loaded
            })
          })
        }

        return {
          name,
          type: 'blocks',
          blocks,
          required,
        } as any
      }

      default:
        // Skip unmapped types gracefully
        return null
    }
  }
}
