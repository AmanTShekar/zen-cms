import type { CollectionConfig } from '@zenithcms/types'

export const Page: CollectionConfig = {
  name: 'Pages',
  slug: 'pages',
  publicRead: true,
  labels: {
    singular: 'Page',
    plural: 'Pages',
  },
  versions: true,
  seo: true,
  fields: [
    {
      name: 'meta',
      type: 'object',
      label: 'SEO Metadata',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'keywords', type: 'text' },
      ],
    },
    { name: 'title', type: 'text', required: true, label: 'Page Title' },
    { name: 'slug', type: 'text', required: true, unique: true, label: 'URL Slug' },
    {
      name: 'sections',
      type: 'blocks',
      label: 'Page Sections',
      blocks: [
        {
          slug: 'hero',
          labels: { singular: 'Hero Banner', plural: 'Hero Banners' },
          fields: [
            { name: 'headline', type: 'text', label: 'Main Headline' },
            { name: 'subheadline', type: 'textarea', label: 'Sub-headline Text' },
            { name: 'callToAction', type: 'text', label: 'Button Label' },
            { name: 'backgroundImage', type: 'media', label: 'Background Image' },
          ],
        },
        {
          slug: 'features',
          labels: { singular: 'Feature Grid', plural: 'Feature Grids' },
          fields: [
            { name: 'heading', type: 'text', label: 'Section Heading' },
            {
              name: 'featureList',
              type: 'array',
              label: 'Features',
              fields: [
                { name: 'title', type: 'text', label: 'Feature Title' },
                { name: 'description', type: 'textarea', label: 'Description' },
                { name: 'icon', type: 'media', label: 'Feature Icon' },
              ],
            },
          ],
        },
        {
          slug: 'testimonials',
          labels: { singular: 'Testimonial Slider', plural: 'Testimonial Sections' },
          fields: [
            { name: 'heading', type: 'text', label: 'Section Heading' },
            {
              name: 'items',
              type: 'array',
              label: 'Testimonials',
              fields: [
                { name: 'quote', type: 'textarea', label: 'Quote' },
                { name: 'author', type: 'text', label: 'Author Name' },
                { name: 'role', type: 'text', label: 'Author Role' },
                { name: 'avatar', type: 'media', label: 'Author Avatar' },
              ],
            },
          ],
        },
        {
          slug: 'pricing',
          labels: { singular: 'Pricing Table', plural: 'Pricing Sections' },
          fields: [
            { name: 'heading', type: 'text', label: 'Section Heading' },
            {
              name: 'plans',
              type: 'array',
              label: 'Pricing Plans',
              fields: [
                { name: 'name', type: 'text', label: 'Plan Name' },
                { name: 'price', type: 'text', label: 'Price' },
                { name: 'features', type: 'textarea', label: 'Features (one per line)' },
                { name: 'buttonText', type: 'text', label: 'Button Label' },
                { name: 'isPopular', type: 'checkbox', label: 'Highlight as Popular' },
              ],
            },
          ],
        },
        {
          slug: 'faq',
          labels: { singular: 'FAQ Accordion', plural: 'FAQ Sections' },
          fields: [
            { name: 'heading', type: 'text', label: 'Section Heading' },
            {
              name: 'questions',
              type: 'array',
              label: 'Questions & Answers',
              fields: [
                { name: 'question', type: 'text', label: 'Question' },
                { name: 'answer', type: 'textarea', label: 'Answer' },
              ],
            },
          ],
        },
        {
          slug: 'cta',
          labels: { singular: 'Call to Action Banner', plural: 'CTA Sections' },
          fields: [
            { name: 'title', type: 'text', label: 'Title' },
            { name: 'description', type: 'textarea', label: 'Description' },
            { name: 'buttonText', type: 'text', label: 'Button Label' },
            { name: 'link', type: 'text', label: 'Button Link' },
          ],
        },
        {
          slug: 'stats',
          labels: { singular: 'Impact Stats', plural: 'Stat Sections' },
          fields: [
            {
              name: 'items',
              type: 'array',
              label: 'Stats',
              fields: [
                { name: 'value', type: 'text', label: 'Value (e.g. 99%)' },
                { name: 'label', type: 'text', label: 'Label (e.g. Uptime)' },
              ],
            },
          ],
        },
        {
          slug: 'richTextSection',
          labels: { singular: 'Custom Content', plural: 'Content Sections' },
          fields: [{ name: 'content', type: 'richtext', label: 'Rich Text Body' }],
        },
      ],
    },
  ],
}
