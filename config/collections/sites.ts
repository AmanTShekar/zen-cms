import type { CollectionConfig } from '@zenithcms/types'

export const Site: CollectionConfig = {
  name: 'Site',
  slug: 'sites',
  publicRead: true,
  timestamps: true,
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'siteId', type: 'text', required: true, label: 'Site ID' },
    { name: 'name', type: 'text', required: true, label: 'Site Name' },
    { name: 'slug', type: 'text', required: true, label: 'Slug' },
    { name: 'domain', type: 'text', label: 'Domain' },
  ],
}
