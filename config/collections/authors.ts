import type { CollectionConfig } from '@zenithcms/types'

export const Author: CollectionConfig = {
  name: 'Author',
  slug: 'authors',
  publicRead: true,
  timestamps: true,
  versions: true,
  labels: { singular: 'Author', plural: 'Authors' },
  fields: [
      { name: 'siteId', type: 'text', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'bio', type: 'textarea' },
    { name: 'avatar', type: 'media' },
  ],
}
