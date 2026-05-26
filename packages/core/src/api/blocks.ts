import { Router, Request, Response } from 'express'
import { BlockDefinition } from '@zenithcms/types'
import { NotFoundError } from '../errors'

const router: Router = Router()

const STANDARD_STYLE_FIELDS: any[] = [
  { name: 'anchorId', type: 'text', label: 'Anchor ID' },
  {
    name: 'theme',
    type: 'select',
    label: 'Theme',
    options: [
      { label: 'Default', value: 'default' },
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
      { label: 'Cyber-Purple Gradient', value: 'cyber-purple' },
      { label: 'Glassmorphic Translucent', value: 'glassmorphic' }
    ]
  },
  {
    name: 'paddingY',
    type: 'select',
    label: 'Vertical Padding',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'small' },
      { label: 'Medium', value: 'medium' },
      { label: 'Large', value: 'large' }
    ]
  },
  {
    name: 'containerWidth',
    type: 'select',
    label: 'Container Width',
    options: [
      { label: 'Boxed', value: 'boxed' },
      { label: 'Full Width', value: 'full-width' }
    ]
  }
]

/**
 * Default block definitions available across all collections.
 * These mirror the hardcoded BLOCK_LIBRARY in the admin constants.
 */
const BASE_DEFAULT_BLOCKS: BlockDefinition[] = [
  {
    slug: 'hero',
    labels: { singular: 'Hero Module', plural: 'Hero Modules' },
    fields: [
      { name: 'headline', type: 'text', label: 'Headline' },
      { name: 'subheadline', type: 'text', label: 'Subheadline' },
      { name: 'callToAction', type: 'text', label: 'CTA' },
      { name: 'backgroundImage', type: 'media', label: 'Background Image' },
    ],
    admin: { description: 'Impactful entry with background & CTA', category: 'Layout', icon: 'Star' },
  },
  {
    slug: 'features',
    labels: { singular: 'Feature Grid', plural: 'Feature Grids' },
    fields: [
      { name: 'heading', type: 'text', label: 'Heading' },
      {
        name: 'featureList',
        type: 'array',
        label: 'Features',
        fields: [
          { name: 'title', type: 'text', label: 'Title' },
          { name: 'description', type: 'text', label: 'Description' },
        ],
      },
      { name: 'featureContent', type: 'dz', label: 'Feature Content' },
    ],
    admin: { description: 'Grid-based feature comparison', category: 'Layout', icon: 'Grid' },
  },
  {
    slug: 'stats',
    labels: { singular: 'Stats Counter', plural: 'Stats Counters' },
    fields: [
      {
        name: 'items',
        type: 'array',
        label: 'Stats',
        fields: [
          { name: 'label', type: 'text', label: 'Label' },
          { name: 'value', type: 'text', label: 'Value' },
        ],
      },
    ],
    admin: { description: 'Animated performance metrics', category: 'Content', icon: 'BarChart4' },
  },
  {
    slug: 'testimonials',
    labels: { singular: 'Testimonials', plural: 'Testimonials' },
    fields: [
      { name: 'heading', type: 'text', label: 'Heading' },
      {
        name: 'items',
        type: 'array',
        label: 'Testimonials',
        fields: [
          { name: 'quote', type: 'textarea', label: 'Quote' },
          { name: 'author', type: 'text', label: 'Author' },
          { name: 'role', type: 'text', label: 'Role' },
        ],
      },
    ],
    admin: { description: 'Customer testimonials & reviews', category: 'Social', icon: 'MessageSquare' },
  },
  {
    slug: 'newsletter',
    labels: { singular: 'Newsletter', plural: 'Newsletters' },
    fields: [
      { name: 'title', type: 'text', label: 'Title' },
      { name: 'description', type: 'text', label: 'Description' },
      { name: 'buttonText', type: 'text', label: 'Button Text' },
    ],
    admin: { description: 'Email signup & list building', category: 'Social', icon: 'Mail' },
  },
  {
    slug: 'pricing',
    labels: { singular: 'Pricing Table', plural: 'Pricing Tables' },
    fields: [
      { name: 'heading', type: 'text', label: 'Heading' },
      {
        name: 'plans',
        type: 'array',
        label: 'Plans',
        fields: [
          { name: 'name', type: 'text', label: 'Name' },
          { name: 'price', type: 'text', label: 'Price' },
          { name: 'features', type: 'text', label: 'Features' },
        ],
      },
    ],
    admin: { description: 'Feature comparison pricing', category: 'Commerce', icon: 'CreditCard' },
  },
  {
    slug: 'cta',
    labels: { singular: 'Call to Action', plural: 'Call to Actions' },
    fields: [
      { name: 'title', type: 'text', label: 'Title' },
      { name: 'description', type: 'text', label: 'Description' },
      { name: 'buttonText', type: 'text', label: 'Button Text' },
    ],
    admin: { description: 'Conversion-focused CTA banner', category: 'Content', icon: 'Zap' },
  },
  {
    slug: 'richTextSection',
    labels: { singular: 'Rich Text', plural: 'Rich Texts' },
    fields: [
      { name: 'content', type: 'richtext', label: 'Content' },
      { name: 'inlineComponents', type: 'dz', label: 'Inline Components', components: ['callout', 'code', 'table', 'accordion', 'socialShare'] },
    ],
    admin: { description: 'WYSIWYG content block with inline widgets', category: 'Content', icon: 'FileText' },
  },
  {
    slug: 'gallery',
    labels: { singular: 'Gallery', plural: 'Galleries' },
    fields: [
      { name: 'heading', type: 'text', label: 'Heading' },
      {
        name: 'items',
        type: 'array',
        label: 'Items',
        fields: [
          { name: 'image', type: 'media', label: 'Image' },
          { name: 'caption', type: 'text', label: 'Caption' },
        ],
      },
    ],
    admin: { description: 'Image gallery & portfolio grid', category: 'Media', icon: 'Layout' },
  },
  {
    slug: 'team',
    labels: { singular: 'Team Members', plural: 'Team Members' },
    fields: [
      { name: 'heading', type: 'text', label: 'Heading' },
      {
        name: 'members',
        type: 'array',
        label: 'Members',
        fields: [
          { name: 'name', type: 'text', label: 'Name' },
          { name: 'role', type: 'text', label: 'Role' },
          { name: 'bio', type: 'text', label: 'Bio' },
        ],
      },
    ],
    admin: { description: 'Staff directory & profiles', category: 'Social', icon: 'Users' },
  },
  {
    slug: 'faq',
    labels: { singular: 'FAQ', plural: 'FAQs' },
    fields: [
      { name: 'heading', type: 'text', label: 'Heading' },
      {
        name: 'items',
        type: 'array',
        label: 'Items',
        fields: [
          { name: 'question', type: 'text', label: 'Question' },
          { name: 'answer', type: 'textarea', label: 'Answer' },
        ],
      },
    ],
    admin: { description: 'Frequently asked questions', category: 'Content', icon: 'MessageSquare' },
  },
  {
    slug: 'callout',
    labels: { singular: 'Callout Box', plural: 'Callout Boxes' },
    fields: [
      {
        name: 'type',
        type: 'select',
        label: 'Type',
        options: [
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Success', value: 'success' },
          { label: 'Error', value: 'error' },
        ],
      },
      { name: 'content', type: 'richtext', label: 'Content' },
    ],
    admin: { description: 'Notice, warning, or tip alert box', category: 'General', icon: 'AlertCircle' },
  },
  {
    slug: 'code',
    labels: { singular: 'Code Snippet', plural: 'Code Snippets' },
    fields: [
      {
        name: 'language',
        type: 'select',
        label: 'Language',
        options: [
          'javascript', 'typescript', 'html', 'css', 'json', 'python', 'rust', 'go', 'bash',
        ],
      },
      { name: 'code', type: 'code', label: 'Code' },
    ],
    admin: { description: 'Syntax-highlighted code editor', category: 'General', icon: 'Code' },
  },
  {
    slug: 'table',
    labels: { singular: 'Data Table', plural: 'Data Tables' },
    fields: [
      {
        name: 'headers',
        type: 'array',
        label: 'Headers',
        fields: [
          { name: 'text', type: 'text', label: 'Text' },
        ],
      },
      {
        name: 'rows',
        type: 'array',
        label: 'Rows',
        fields: [
          {
            name: 'cells',
            type: 'array',
            label: 'Cells',
            fields: [{ name: 'text', type: 'text', label: 'Text' }],
          },
        ],
      },
    ],
    admin: { description: 'Grid layout for comparative data', category: 'General', icon: 'Table' },
  },
  {
    slug: 'accordion',
    labels: { singular: 'Accordion', plural: 'Accordions' },
    fields: [
      { name: 'heading', type: 'text', label: 'Heading' },
      {
        name: 'items',
        type: 'array',
        label: 'Items',
        fields: [
          { name: 'title', type: 'text', label: 'Item Title' },
          { name: 'content', type: 'richtext', label: 'Item Content' }
        ]
      }
    ],
    admin: { description: 'Expandable content panels', category: 'Content', icon: 'MessageSquare' }
  },
  {
    slug: 'logoGrid',
    labels: { singular: 'Logo Grid', plural: 'Logo Grids' },
    fields: [
      { name: 'heading', type: 'text', label: 'Heading' },
      {
        name: 'logos',
        type: 'array',
        label: 'Logos',
        fields: [
          { name: 'image', type: 'media', label: 'Logo Image' },
          { name: 'name', type: 'text', label: 'Company Name' },
          { name: 'link', type: 'text', label: 'Link' }
        ]
      }
    ],
    admin: { description: 'Client & partner showcase', category: 'Media', icon: 'Grid' }
  },
  {
    slug: 'videoHero',
    labels: { singular: 'Video Hero', plural: 'Video Heros' },
    fields: [
      { name: 'headline', type: 'text', label: 'Headline' },
      { name: 'subheadline', type: 'text', label: 'Subheadline' },
      { name: 'videoUrl', type: 'text', label: 'Video URL' },
      { name: 'posterImage', type: 'media', label: 'Poster Image' },
      { name: 'autoplay', type: 'boolean', label: 'Autoplay' },
      { name: 'controls', type: 'boolean', label: 'Show Controls' }
    ],
    admin: { description: 'Full-width video background hero', category: 'Layout', icon: 'Zap' }
  },
  {
    slug: 'announcementBar',
    labels: { singular: 'Announcement Bar', plural: 'Announcement Bars' },
    fields: [
      { name: 'message', type: 'text', label: 'Message' },
      { name: 'link', type: 'text', label: 'Link' },
      { name: 'linkText', type: 'text', label: 'Link Text' },
      { name: 'dismissible', type: 'boolean', label: 'Dismissible' }
    ],
    admin: { description: 'Site-wide alert banner', category: 'General', icon: 'AlertCircle' }
  },
  {
    slug: 'contactForm',
    labels: { singular: 'Contact Form', plural: 'Contact Forms' },
    fields: [
      { name: 'title', type: 'text', label: 'Form Title' },
      { name: 'description', type: 'text', label: 'Description' },
      { name: 'emailRecipient', type: 'text', label: 'Recipient Email' },
      { name: 'submitButtonText', type: 'text', label: 'Button Text' }
    ],
    admin: { description: 'Standard contact & lead capture form', category: 'Commerce', icon: 'Mail' }
  },
  {
    slug: 'socialShare',
    labels: { singular: 'Social Links', plural: 'Social Links' },
    fields: [
      { name: 'heading', type: 'text', label: 'Heading' },
      {
        name: 'platforms',
        type: 'array',
        label: 'Platforms',
        fields: [
          {
            name: 'platform',
            type: 'select',
            label: 'Platform',
            options: [
              { label: 'Twitter/X', value: 'twitter' },
              { label: 'Facebook', value: 'facebook' },
              { label: 'LinkedIn', value: 'linkedin' },
              { label: 'GitHub', value: 'github' },
              { label: 'YouTube', value: 'youtube' }
            ]
          },
          { name: 'url', type: 'text', label: 'URL' }
        ]
      }
    ],
    admin: { description: 'Social media link bar', category: 'Social', icon: 'Users' }
  },
  {
    slug: 'pageTitle',
    labels: { singular: 'Page Title', plural: 'Page Titles' },
    fields: [
      { name: 'title', type: 'text', label: 'Title' }
    ],
    admin: { description: 'Page-level title field', category: 'General', icon: 'Type' }
  },
  {
    slug: 'pageDescription',
    labels: { singular: 'Page Description', plural: 'Page Descriptions' },
    fields: [
      { name: 'description', type: 'richtext', label: 'Description' },
      { name: 'inlineWidgets', type: 'dz', label: 'Inline Widgets', components: ['callout', 'code', 'table'] }
    ],
    admin: { description: 'Page-level description field', category: 'General', icon: 'FileText' }
  }
]

const DEFAULT_BLOCKS: BlockDefinition[] = BASE_DEFAULT_BLOCKS.map(block => ({
  ...block,
  fields: [...block.fields, ...STANDARD_STYLE_FIELDS]
}))

// ── GET /api/v1/blocks — List all available block definitions ─────────────
router.get('/', async (_req: Request, res: Response, next) => {
  try {
    res.json({ data: DEFAULT_BLOCKS })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/blocks/:slug — Get a single block definition ─────────────
router.get('/:slug', async (req: Request, res: Response, next) => {
  try {
    const block = DEFAULT_BLOCKS.find((b) => b.slug === req.params.slug)
    if (!block) {
      throw new NotFoundError('Block', req.params.slug)
    }
    res.json({ data: block })
  } catch (err) {
    next(err)
  }
})

export default router
