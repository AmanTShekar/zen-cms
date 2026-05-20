import type { CollectionConfig } from '@zenithcms/types'

export const Post: CollectionConfig = {
  name: 'Post',
  slug: 'posts',
  publicRead: true,
  drafts: true,
  seo: true,
  timestamps: true,
  labels: { singular: 'Post', plural: 'Posts' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'content', type: 'richtext' },
    { name: 'coverImage', type: 'media' },
    {
      name: 'tags',
      type: 'select',
      options: ['tech', 'design', 'business', 'lifestyle'],
      hasMany: true,
    },
    { name: 'publishedAt', type: 'date' },
    {
      name: 'sections',
      type: 'blocks',
      label: 'Modular Sections',
      blocks: [
        {
          slug: 'hero',
          labels: { singular: 'Hero', plural: 'Heroes' },
          fields: [
            { name: 'headline', type: 'text' },
            { name: 'subheadline', type: 'textarea' },
            { name: 'callToAction', type: 'text' },
            { name: 'backgroundImage', type: 'media' },
          ],
        },
        {
          slug: 'features',
          labels: { singular: 'Features', plural: 'Features' },
          fields: [
            { name: 'heading', type: 'text' },
            {
              name: 'featureList',
              type: 'array',
              fields: [
                { name: 'title', type: 'text' },
                { name: 'description', type: 'textarea' },
                { name: 'icon', type: 'media' },
              ],
            },
          ],
        },
        {
          slug: 'testimonials',
          labels: { singular: 'Testimonials', plural: 'Testimonials' },
          fields: [
            { name: 'heading', type: 'text' },
            {
              name: 'items',
              type: 'array',
              fields: [
                { name: 'quote', type: 'textarea' },
                { name: 'author', type: 'text' },
                { name: 'role', type: 'text' },
                { name: 'avatar', type: 'media' },
              ],
            },
          ],
        },
        {
          slug: 'pricing',
          labels: { singular: 'Pricing', plural: 'Pricing' },
          fields: [
            { name: 'heading', type: 'text' },
            {
              name: 'plans',
              type: 'array',
              fields: [
                { name: 'name', type: 'text' },
                { name: 'price', type: 'text' },
                { name: 'features', type: 'textarea' },
                { name: 'buttonText', type: 'text' },
                { name: 'isPopular', type: 'checkbox' },
              ],
            },
          ],
        },
        {
          slug: 'faq',
          labels: { singular: 'FAQ', plural: 'FAQs' },
          fields: [
            { name: 'heading', type: 'text' },
            {
              name: 'questions',
              type: 'array',
              fields: [
                { name: 'question', type: 'text' },
                { name: 'answer', type: 'textarea' },
              ],
            },
          ],
        },
        {
          slug: 'cta',
          labels: { singular: 'CTA', plural: 'CTAs' },
          fields: [
            { name: 'title', type: 'text' },
            { name: 'description', type: 'textarea' },
            { name: 'buttonText', type: 'text' },
            { name: 'link', type: 'text' },
          ],
        },
        {
          slug: 'stats',
          labels: { singular: 'Stats', plural: 'Stats' },
          fields: [
            {
              name: 'items',
              type: 'array',
              fields: [
                { name: 'value', type: 'text' },
                { name: 'label', type: 'text' },
              ],
            },
          ],
        },
        {
          slug: 'richTextSection',
          labels: { singular: 'Rich Text', plural: 'Rich Text' },
          fields: [{ name: 'content', type: 'richtext' }],
        },
      ],
    },
  ],
}
