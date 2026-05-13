import type { CollectionConfig } from '@zenith/types';

export const Author: CollectionConfig = {
  name: 'Author',
  slug: 'authors',
  timestamps: true,
  labels: { singular: 'Author', plural: 'Authors' },
  fields: [
    { name: 'name',   type: 'text',  required: true  },
    { name: 'email',  type: 'email', required: true, unique: true },
    { name: 'bio',    type: 'textarea'               },
    { name: 'avatar', type: 'media'                  },
  ],
};
