import type { CollectionConfig } from '@zenithcms/types'

export const Product: CollectionConfig = {
  name: 'Product',
  slug: 'products',
  drafts: true,
  timestamps: true,
  labels: { singular: 'Product', plural: 'Products' },
  publicRead: true,
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'price', type: 'number', required: true },
    { name: 'description', type: 'richtext' },
    { name: 'gallery', type: 'media', hasMany: true },
    { name: 'inStock', type: 'checkbox', defaultValue: true },
    {
      name: 'specs',
      type: 'group',
      fields: [
        { name: 'weight', type: 'number' },
        { name: 'color', type: 'text' },
        { name: 'sku', type: 'text' },
      ],
    },
    {
      name: 'category',
      type: 'select',
      options: ['electronics', 'clothing', 'home', 'sports'],
      required: true,
    },
    {
      name: 'layout',
      type: 'blocks',
      label: 'Product Landing Page Sections',
      blocks: [
        {
          slug: 'hero',
          labels: { singular: 'Hero', plural: 'Heroes' },
          fields: [{ name: 'headline', type: 'text' }],
        },
        {
          slug: 'features',
          labels: { singular: 'Features', plural: 'Features' },
          fields: [{ name: 'items', type: 'array', fields: [{ name: 'title', type: 'text' }] }],
        },
        {
          slug: 'stats',
          labels: { singular: 'Stats', plural: 'Stats' },
          fields: [{ name: 'items', type: 'array', fields: [{ name: 'value', type: 'text' }] }],
        },
      ],
    },
  ],
}
