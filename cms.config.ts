import type { CMSConfig } from '@zenith/types';

/**
 * Zenith CMS Configuration
 * ───────────────────────
 * Single source of truth for your content architecture.
 *
 *   ✓ GET  /api/v1/<slug>          — List with pagination
 *   ✓ GET  /api/v1/<slug>/:id      — Get single
 *   ✓ POST /api/v1/<slug>          — Create (with Zod validation)
 *   ✓ PUT  /api/v1/<slug>/:id      — Update (with Zod validation)
 *   ✓ DELETE /api/v1/<slug>/:id    — Delete
 *   ✓ POST /api/v1/<slug>/:id/publish   (if drafts: true)
 *   ✓ POST /api/v1/<slug>/:id/unpublish (if drafts: true)
 *
 * No extra code needed. Restart the server and it's live.
 */
const config: CMSConfig = {
  collections: [
    {
      name: 'Post',
      slug: 'posts',
      drafts: true,
      seo: true,
      timestamps: true,
      labels: { singular: 'Post', plural: 'Posts' },
      fields: [
        { name: 'title',       type: 'text',     required: true  },
        { name: 'slug',        type: 'text',     required: true, unique: true },
        { name: 'content',     type: 'richtext'                   },
        { name: 'coverImage',  type: 'media'                      },
        { name: 'tags',        type: 'select',
          options: ['tech', 'design', 'business', 'lifestyle'],
          hasMany: true
        },
        { name: 'publishedAt', type: 'date'                       },
        {
          name: 'sections',
          type: 'blocks',
          label: 'Modular Sections',
          blocks: [
            { slug: 'hero', labels: { singular: 'Hero', plural: 'Heroes' }, fields: [{ name: 'headline', type: 'text' }, { name: 'subheadline', type: 'textarea' }, { name: 'callToAction', type: 'text' }, { name: 'backgroundImage', type: 'media' }] },
            { slug: 'features', labels: { singular: 'Features', plural: 'Features' }, fields: [{ name: 'heading', type: 'text' }, { name: 'featureList', type: 'array', fields: [{ name: 'title', type: 'text' }, { name: 'description', type: 'textarea' }, { name: 'icon', type: 'media' }] }] },
            { slug: 'testimonials', labels: { singular: 'Testimonials', plural: 'Testimonials' }, fields: [{ name: 'heading', type: 'text' }, { name: 'items', type: 'array', fields: [{ name: 'quote', type: 'textarea' }, { name: 'author', type: 'text' }, { name: 'role', type: 'text' }, { name: 'avatar', type: 'media' }] }] },
            { slug: 'pricing', labels: { singular: 'Pricing', plural: 'Pricing' }, fields: [{ name: 'heading', type: 'text' }, { name: 'plans', type: 'array', fields: [{ name: 'name', type: 'text' }, { name: 'price', type: 'text' }, { name: 'features', type: 'textarea' }, { name: 'buttonText', type: 'text' }, { name: 'isPopular', type: 'checkbox' }] }] },
            { slug: 'faq', labels: { singular: 'FAQ', plural: 'FAQs' }, fields: [{ name: 'heading', type: 'text' }, { name: 'questions', type: 'array', fields: [{ name: 'question', type: 'text' }, { name: 'answer', type: 'textarea' }] }] },
            { slug: 'cta', labels: { singular: 'CTA', plural: 'CTAs' }, fields: [{ name: 'title', type: 'text' }, { name: 'description', type: 'textarea' }, { name: 'buttonText', type: 'text' }, { name: 'link', type: 'text' }] },
            { slug: 'stats', labels: { singular: 'Stats', plural: 'Stats' }, fields: [{ name: 'items', type: 'array', fields: [{ name: 'value', type: 'text' }, { name: 'label', type: 'text' }] }] },
            { slug: 'richTextSection', labels: { singular: 'Rich Text', plural: 'Rich Text' }, fields: [{ name: 'content', type: 'richtext' }] }
          ]
        }
      ],
    },
    {
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
    },
    {
      name: 'Product',
      slug: 'products',
      drafts: true,
      timestamps: true,
      labels: { singular: 'Product', plural: 'Products' },
      publicRead: true,
      fields: [
        { name: 'title',       type: 'text',   required: true   },
        { name: 'price',       type: 'number', required: true   },
        { name: 'description', type: 'richtext'                 },
        { name: 'gallery',     type: 'media',  hasMany: true    },
        { name: 'inStock',     type: 'checkbox', defaultValue: true },
        {
          name: 'specs',
          type: 'group',
          fields: [
            { name: 'weight', type: 'number' },
            { name: 'color',  type: 'text'   },
            { name: 'sku',    type: 'text'   },
          ],
        },
        { name: 'category', type: 'select',
          options: ['electronics', 'clothing', 'home', 'sports'],
          required: true
        },
        {
          name: 'layout',
          type: 'blocks',
          label: 'Product Landing Page Sections',
          blocks: [
            { slug: 'hero', labels: { singular: 'Hero', plural: 'Heroes' }, fields: [{ name: 'headline', type: 'text' }] },
            { slug: 'features', labels: { singular: 'Features', plural: 'Features' }, fields: [{ name: 'items', type: 'array', fields: [{ name: 'title', type: 'text' }] }] },
            { slug: 'stats', labels: { singular: 'Stats', plural: 'Stats' }, fields: [{ name: 'items', type: 'array', fields: [{ name: 'value', type: 'text' }] }] }
          ]
        }
      ],
    },
    {
      name: 'Pages',
      slug: 'pages',
      labels: {
        singular: 'Page',
        plural: 'Pages'
      },
      fields: [
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
              ]
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
                  ]
                }
              ]
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
                  ]
                }
              ]
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
                  ]
                }
              ]
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
                  ]
                }
              ]
            },
            {
              slug: 'cta',
              labels: { singular: 'Call to Action Banner', plural: 'CTA Sections' },
              fields: [
                { name: 'title', type: 'text', label: 'Title' },
                { name: 'description', type: 'textarea', label: 'Description' },
                { name: 'buttonText', type: 'text', label: 'Button Label' },
                { name: 'link', type: 'text', label: 'Button Link' },
              ]
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
                  ]
                }
              ]
            },
            {
              slug: 'richTextSection',
              labels: { singular: 'Custom Content', plural: 'Content Sections' },
              fields: [
                { name: 'content', type: 'richtext', label: 'Rich Text Body' }
              ]
            }
          ]
        }
      ]
    }
  ],
  
  globals: [
    {
      name: 'Landing Page',
      slug: 'landing-page',
      singleton: true,
      publicRead: true,
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Page Title' },
        { name: 'heroDescription', type: 'richtext', label: 'Main Content / Description' },
        {
          name: 'sections',
          type: 'blocks',
          blocks: [
            {
              slug: 'hero',
              labels: { singular: 'Hero Banner', plural: 'Hero Banners' },
              fields: [
                { name: 'headline', type: 'text', label: 'Main Headline' },
                { name: 'subheadline', type: 'textarea', label: 'Sub-headline Text' },
                { name: 'callToAction', type: 'text', label: 'Button Label' },
                { name: 'backgroundImage', type: 'media', label: 'Background Image' },
              ]
            },
            {
              slug: 'features',
              labels: { singular: 'Key Features', plural: 'Feature Sections' },
              fields: [
                { name: 'heading', type: 'text', label: 'Section Heading' },
                {
                  name: 'featureList',
                  type: 'array',
                  label: 'Feature Items',
                  fields: [
                    { name: 'title', type: 'text', label: 'Feature Title' },
                    { name: 'description', type: 'textarea', label: 'Feature Description' },
                    { name: 'icon', type: 'media', label: 'Feature Icon' },
                  ]
                }
              ]
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
                    { name: 'role', type: 'text', label: 'Author Role/Company' },
                    { name: 'avatar', type: 'media', label: 'Author Avatar' },
                  ]
                }
              ]
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
                    { name: 'price', type: 'text', label: 'Price (e.g. $29/mo)' },
                    { name: 'features', type: 'textarea', label: 'Features (one per line)' },
                    { name: 'buttonText', type: 'text', label: 'CTA Button' },
                    { name: 'isPopular', type: 'checkbox', label: 'Highlight as Popular' },
                  ]
                }
              ]
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
                  ]
                }
              ]
            },
            {
              slug: 'cta',
              labels: { singular: 'Call to Action Banner', plural: 'CTA Sections' },
              fields: [
                { name: 'title', type: 'text', label: 'Title' },
                { name: 'description', type: 'textarea', label: 'Description' },
                { name: 'buttonText', type: 'text', label: 'Button Label' },
                { name: 'link', type: 'text', label: 'Button Link' },
              ]
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
                  ]
                }
              ]
            },
            {
              slug: 'richTextSection',
              labels: { singular: 'Custom Content', plural: 'Content Sections' },
              fields: [
                { name: 'content', type: 'richtext', label: 'Rich Text Body' }
              ]
            }
          ]
        }
      ]
    }
  ],

  // Optional: register webhooks to fire on collection events
  webhooks: [
    // {
    //   url: 'https://your-site.com/api/revalidate',
    //   secret: process.env.WEBHOOK_SECRET || '',
    //   events: ['posts.published', 'posts.updated'],
    // },
  ],
};

export default config;
