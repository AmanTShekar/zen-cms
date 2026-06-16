import { describe, it, expect } from 'vitest'
import { FieldConfig } from '@zenith-open/zenithcms-types'
import { createZodSchema } from './engine'

describe('Zod Schema Engine', () => {
  it('should generate a schema for basic text fields', () => {
    const fields: FieldConfig[] = [
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text' },
    ]
    const schema = createZodSchema(fields)
    expect(schema.parse({ title: 'Hello', description: 'World' })).toEqual({
      title: 'Hello',
      description: 'World',
    })
    expect(() => schema.parse({ description: 'World' })).toThrow() // missing required title
  })

  it('should validate email fields', () => {
    const fields: FieldConfig[] = [{ name: 'email', type: 'email', required: true }]
    const schema = createZodSchema(fields)
    expect(schema.parse({ email: 'user@example.com' })).toEqual({ email: 'user@example.com' })
    expect(() => schema.parse({ email: 'not-an-email' })).toThrow()
  })

  it('should handle number and checkbox fields', () => {
    const fields: FieldConfig[] = [
      { name: 'price', type: 'number', required: true },
      { name: 'isActive', type: 'checkbox' },
    ]
    const schema = createZodSchema(fields)
    expect(schema.parse({ price: 10, isActive: true })).toEqual({ price: 10, isActive: true })
    expect(() => schema.parse({ price: '10' })).toThrow() // string not allowed for number
  })

  it('should handle array of strings using hasMany on select', () => {
    const fields: FieldConfig[] = [
      {
        name: 'tags',
        type: 'select',
        options: ['tech', 'design', 'business'],
        hasMany: true,
        required: true,
      },
    ]
    const schema = createZodSchema(fields)
    expect(schema.parse({ tags: ['tech', 'design'] })).toEqual({ tags: ['tech', 'design'] })
    expect(() => schema.parse({ tags: ['invalid-tag'] })).toThrow()
  })

  it('should handle array of sub-document fields', () => {
    const fields: FieldConfig[] = [
      {
        name: 'items',
        type: 'array',
        required: true,
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'qty', type: 'number', required: true },
        ],
      },
    ]
    const schema = createZodSchema(fields)
    expect(schema.parse({ items: [{ name: 'Widget', qty: 3 }] })).toEqual({
      items: [{ name: 'Widget', qty: 3 }],
    })
    expect(() => schema.parse({ items: [{ name: 'Widget' }] })).toThrow() // missing qty
  })

  it('should handle group (nested object) fields', () => {
    const fields: FieldConfig[] = [
      {
        name: 'seo',
        type: 'group',
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text' },
        ],
      },
    ]
    const schema = createZodSchema(fields)
    const result = schema.parse({ seo: { title: 'My Title' } })
    expect(result.seo.title).toBe('My Title')
    // Missing required field in group should throw
    expect(() => schema.parse({ seo: {} })).toThrow()
  })

  it('should handle media fields', () => {
    const fields: FieldConfig[] = [{ name: 'image', type: 'media', required: true }]
    const schema = createZodSchema(fields)
    const validMedia = {
      image: {
        url: 'https://example.com/image.jpg',
        id: 'img_123',
        alt: 'Example image',
        width: 800,
        height: 600,
      },
    }
    expect(schema.parse(validMedia)).toEqual(validMedia)
    expect(() => schema.parse({ image: { url: 123 } })).toThrow()
  })

  it('should handle select fields with options', () => {
    const fields: FieldConfig[] = [
      { name: 'status', type: 'select', options: ['draft', 'published'], required: true },
    ]
    const schema = createZodSchema(fields)
    expect(schema.parse({ status: 'draft' })).toEqual({ status: 'draft' })
    expect(() => schema.parse({ status: 'archived' })).toThrow()
  })

  it('should handle select with object options {label, value}', () => {
    const fields: FieldConfig[] = [
      {
        name: 'priority',
        type: 'select',
        options: [
          { label: 'High', value: 'high' },
          { label: 'Low', value: 'low' },
        ],
        required: true,
      },
    ]
    const schema = createZodSchema(fields)
    expect(schema.parse({ priority: 'high' })).toEqual({ priority: 'high' })
    expect(() => schema.parse({ priority: 'medium' })).toThrow()
  })
})
