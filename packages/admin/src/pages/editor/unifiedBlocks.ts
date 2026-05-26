import type { FieldDefinition } from './constants'

export interface UnifiedBlockDefinition {
  type: string
  iconName: string
  title: string
  description: string
  category: 'Layout' | 'Content' | 'Commerce' | 'Media' | 'Social' | 'General'
  fields: FieldDefinition[]
  defaultContent: Record<string, any>
}

export const STANDARD_STYLE_FIELDS: FieldDefinition[] = [
  { name: 'anchorId', type: 'text', placeholder: 'e.g. section-id', label: 'Anchor ID' },
  {
    name: 'theme',
    type: 'select',
    options: [
      { label: 'Default', value: 'default' },
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
      { label: 'Cyber-Purple Gradient', value: 'cyber-purple' },
      { label: 'Glassmorphic Translucent', value: 'glassmorphic' }
    ],
    placeholder: 'Select Theme',
    label: 'Theme'
  },
  {
    name: 'paddingY',
    type: 'select',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'small' },
      { label: 'Medium', value: 'medium' },
      { label: 'Large', value: 'large' }
    ],
    placeholder: 'Select Vertical Padding',
    label: 'Vertical Padding'
  },
  {
    name: 'containerWidth',
    type: 'select',
    options: [
      { label: 'Boxed', value: 'boxed' },
      { label: 'Full Width', value: 'full-width' }
    ],
    placeholder: 'Select Container Width',
    label: 'Container Width'
  }
]

export const STANDARD_STYLE_DEFAULTS = {
  anchorId: '',
  theme: 'default',
  paddingY: 'medium',
  containerWidth: 'boxed'
}

const BASE_BLOCK_LIBRARY: UnifiedBlockDefinition[] = [
  {
    type: 'hero',
    iconName: 'Star',
    title: 'Hero Module',
    description: 'Impactful entry with background & CTA',
    category: 'Layout',
    fields: [
      { name: 'headline', type: 'text', placeholder: 'Future Engine' },
      { name: 'subheadline', type: 'text', placeholder: 'Modular architecture for visionaries.' },
      { name: 'callToAction', type: 'text', placeholder: 'Launch Protocol' },
      { name: 'backgroundImage', type: 'media' },
    ],
    defaultContent: {
      headline: 'Future Engine',
      subheadline: 'Modular architecture for visionaries.',
      callToAction: 'Launch Protocol',
      backgroundImage: null,
    },
  },
  {
    type: 'features',
    iconName: 'Grid',
    title: 'Feature Grid',
    description: 'Grid-based feature comparison',
    category: 'Layout',
    fields: [
      { name: 'heading', type: 'text', placeholder: 'Core Capabilities' },
      {
        name: 'featureList',
        type: 'array',
        fields: [
          { name: 'title', type: 'text', placeholder: 'Title' },
          { name: 'description', type: 'text', placeholder: 'Description' },
        ],
      },
      {
        name: 'featureContent',
        type: 'dz',
        label: 'Feature Content',
      },
    ],
    defaultContent: {
      heading: 'Core Capabilities',
      featureList: [
        { title: 'Velocity', description: 'Near-zero latency lookups.' },
        { title: 'Security', description: 'End-to-end encryption.' },
      ],
      featureContent: [],
    },
  },
  {
    type: 'stats',
    iconName: 'BarChart4',
    title: 'Stats Counter',
    description: 'Animated performance metrics',
    category: 'Content',
    fields: [
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'label', type: 'text', placeholder: 'Uptime' },
          { name: 'value', type: 'text', placeholder: '99.9%' },
        ],
      },
    ],
    defaultContent: {
      items: [
        { label: 'Uptime', value: '99.9%' },
        { label: 'Latency', value: '12ms' },
      ],
    },
  },
  {
    type: 'testimonials',
    iconName: 'MessageSquare',
    title: 'Testimonials',
    description: 'Customer testimonials & reviews',
    category: 'Social',
    fields: [
      { name: 'heading', type: 'text', placeholder: 'Global Voices' },
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'quote', type: 'text', placeholder: 'Quote' },
          { name: 'author', type: 'text', placeholder: 'Author' },
          { name: 'role', type: 'text', placeholder: 'Role' },
        ],
      },
    ],
    defaultContent: {
      heading: 'Global Voices',
      items: [
        {
          quote: 'Zenith changed the scale of our deployment.',
          author: 'Alex_Vander',
          role: 'Architect',
        },
      ],
    },
  },
  {
    type: 'newsletter',
    iconName: 'Mail',
    title: 'Newsletter',
    description: 'Email signup & list building',
    category: 'Social',
    fields: [
      { name: 'title', type: 'text', placeholder: 'Join The Network' },
      { name: 'description', type: 'text', placeholder: 'Stay updated.' },
      { name: 'buttonText', type: 'text', placeholder: 'Subscribe' },
    ],
    defaultContent: {
      title: 'Join The Network',
      description: 'Stay updated with the latest manifests.',
      buttonText: 'Subscribe',
    },
  },
  {
    type: 'pricing',
    iconName: 'CreditCard',
    title: 'Pricing Table',
    description: 'Feature comparison pricing',
    category: 'Commerce',
    fields: [
      { name: 'heading', type: 'text', placeholder: 'Parametric Plans' },
      {
        name: 'plans',
        type: 'array',
        fields: [
          { name: 'name', type: 'text', placeholder: 'Enterprise' },
          { name: 'price', type: 'text', placeholder: '$999/mo' },
          { name: 'features', type: 'text', placeholder: 'Unlimited Nodes' },
        ],
      },
    ],
    defaultContent: {
      heading: 'Parametric Plans',
      plans: [{ name: 'Enterprise', price: '$999/mo', features: 'Unlimited Nodes' }],
    },
  },
  {
    type: 'cta',
    iconName: 'Zap',
    title: 'Call to Action',
    description: 'Conversion-focused CTA banner',
    category: 'Content',
    fields: [
      { name: 'title', type: 'text', placeholder: 'Ready to scale?' },
      { name: 'description', type: 'text', placeholder: 'Join the next generation.' },
      { name: 'buttonText', type: 'text', placeholder: 'Connect Now' },
    ],
    defaultContent: {
      title: 'Ready to scale?',
      description: 'Join the next generation of architects.',
      buttonText: 'Connect Now',
    },
  },
  {
    type: 'richTextSection',
    iconName: 'FileText',
    title: 'Rich Text',
    description: 'WYSIWYG content block with inline widgets',
    category: 'Content',
    fields: [
      { name: 'content', type: 'richtext' },
      {
        name: 'inlineComponents',
        type: 'dz',
        label: 'Inline Components',
        components: ['callout', 'code', 'table', 'accordion', 'socialShare'],
      },
    ],
    defaultContent: {
      content: '<h2>Deep Architecture</h2><p>Refined prose for complex narratives.</p>',
      inlineComponents: [],
    },
  },
  {
    type: 'gallery',
    iconName: 'Layout',
    title: 'Gallery',
    description: 'Image gallery & portfolio grid',
    category: 'Media',
    fields: [
      { name: 'heading', type: 'text', placeholder: 'Project Exhibits' },
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'image', type: 'media' },
          { name: 'caption', type: 'text', placeholder: 'System Node 01' },
        ],
      },
    ],
    defaultContent: {
      heading: 'Project Exhibits',
      items: [{ image: null, caption: 'System Node 01' }],
    },
  },
  {
    type: 'team',
    iconName: 'Users',
    title: 'Team Members',
    description: 'Staff directory & profiles',
    category: 'Social',
    fields: [
      { name: 'heading', type: 'text', placeholder: 'System Architects' },
      {
        name: 'members',
        type: 'array',
        fields: [
          { name: 'name', type: 'text', placeholder: 'Name' },
          { name: 'role', type: 'text', placeholder: 'Role' },
          { name: 'bio', type: 'text', placeholder: 'Bio' },
        ],
      },
    ],
    defaultContent: {
      heading: 'System Architects',
      members: [{ name: 'Elena Kors', role: 'Lead Developer', bio: 'Neural network specialist.' }],
    },
  },
  {
    type: 'faq',
    iconName: 'MessageSquare',
    title: 'FAQ',
    description: 'Frequently asked questions',
    category: 'Content',
    fields: [
      { name: 'heading', type: 'text', placeholder: 'Protocol FAQ' },
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'question', type: 'text', placeholder: 'Question' },
          { name: 'answer', type: 'text', placeholder: 'Answer' },
        ],
      },
    ],
    defaultContent: {
      heading: 'Protocol FAQ',
      items: [{ question: 'How secure is Zenith?', answer: 'AES-256 encryption at rest.' }],
    },
  },
  {
    type: 'callout',
    iconName: 'AlertCircle',
    title: 'Callout Box',
    description: 'Notice, warning, or tip alert box',
    category: 'General',
    fields: [
      {
        name: 'type',
        type: 'select',
        options: [
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Success', value: 'success' },
          { label: 'Error', value: 'error' },
        ],
        placeholder: 'Select type'
      },
      { name: 'content', type: 'richtext', placeholder: 'Alert details...' }
    ],
    defaultContent: {
      type: 'info',
      content: '<p>Important notice for users.</p>'
    }
  },
  {
    type: 'code',
    iconName: 'Code',
    title: 'Code Snippet',
    description: 'Syntax-highlighted code editor',
    category: 'General',
    fields: [
      {
        name: 'language',
        type: 'select',
        options: ['javascript', 'typescript', 'html', 'css', 'json', 'python', 'rust', 'go', 'bash'],
        placeholder: 'Select language'
      },
      { name: 'code', type: 'code', placeholder: 'const x = 42;' }
    ],
    defaultContent: {
      language: 'javascript',
      code: 'console.log("Hello Zenith!");'
    }
  },
  {
    type: 'table',
    iconName: 'Table',
    title: 'Data Table',
    description: 'Grid layout for comparative data',
    category: 'General',
    fields: [
      {
        name: 'headers',
        type: 'array',
        fields: [{ name: 'text', type: 'text', placeholder: 'Header text' }]
      },
      {
        name: 'rows',
        type: 'array',
        fields: [
          {
            name: 'cells',
            type: 'array',
            fields: [{ name: 'text', type: 'text', placeholder: 'Cell text' }]
          }
        ]
      }
    ],
    defaultContent: {
      headers: [{ text: 'Feature' }, { text: 'Zenith' }, { text: 'Others' }],
      rows: [
        { cells: [{ text: 'Customization' }, { text: 'High' }, { text: 'Medium' }] },
        { cells: [{ text: 'Speed' }, { text: 'Insane' }, { text: 'Average' }] }
      ]
    }
  },
  {
    type: 'accordion',
    iconName: 'MessageSquare',
    title: 'Accordion',
    description: 'Expandable content panels',
    category: 'Content',
    fields: [
      { name: 'heading', type: 'text', placeholder: 'Frequently Asked Questions' },
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'title', type: 'text', placeholder: 'Item Title' },
          { name: 'content', type: 'richtext', placeholder: 'Item content details...' }
        ]
      }
    ],
    defaultContent: {
      heading: 'Frequently Asked Questions',
      items: [
        { title: 'What is Zenith?', content: '<p>Zenith is a premium decoupled hybrid CMS.</p>' },
        { title: 'How does it render?', content: '<p>Via high-performance visual canvas layers.</p>' }
      ]
    }
  },
  {
    type: 'logoGrid',
    iconName: 'Grid',
    title: 'Logo Grid',
    description: 'Client & partner showcase',
    category: 'Media',
    fields: [
      { name: 'heading', type: 'text', placeholder: 'Trusted by global teams' },
      {
        name: 'logos',
        type: 'array',
        fields: [
          { name: 'image', type: 'media' },
          { name: 'name', type: 'text', placeholder: 'Company Name' },
          { name: 'link', type: 'text', placeholder: 'https://company.com' }
        ]
      }
    ],
    defaultContent: {
      heading: 'Trusted by global teams',
      logos: [
        { image: null, name: 'Vanguard Inc', link: 'https://vanguard.io' },
        { image: null, name: 'Apex Ltd', link: 'https://apex.co' }
      ]
    }
  },
  {
    type: 'videoHero',
    iconName: 'Zap',
    title: 'Video Hero',
    description: 'Full-width video background hero',
    category: 'Layout',
    fields: [
      { name: 'headline', type: 'text', placeholder: 'Experience Velocity' },
      { name: 'subheadline', type: 'text', placeholder: 'Where performance meets elegance.' },
      { name: 'videoUrl', type: 'text', placeholder: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4' },
      { name: 'posterImage', type: 'media' },
      { name: 'autoplay', type: 'boolean' },
      { name: 'controls', type: 'boolean' }
    ],
    defaultContent: {
      headline: 'Experience Velocity',
      subheadline: 'Where performance meets elegance.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4',
      posterImage: null,
      autoplay: true,
      controls: false
    }
  },
  {
    type: 'announcementBar',
    iconName: 'AlertCircle',
    title: 'Announcement Bar',
    description: 'Site-wide alert banner',
    category: 'General',
    fields: [
      { name: 'message', type: 'text', placeholder: 'Attention: Version 2.0 has been deployed.' },
      { name: 'link', type: 'text', placeholder: 'https://zenith.io/changelog' },
      { name: 'linkText', type: 'text', placeholder: 'Read Changelog' },
      { name: 'dismissible', type: 'boolean' }
    ],
    defaultContent: {
      message: 'Attention: Version 2.0 has been deployed.',
      link: 'https://zenith.io/changelog',
      linkText: 'Read Changelog',
      dismissible: true
    }
  },
  {
    type: 'contactForm',
    iconName: 'Mail',
    title: 'Contact Form',
    description: 'Standard contact & lead capture form',
    category: 'Commerce',
    fields: [
      { name: 'title', type: 'text', placeholder: 'Initiate Contact' },
      { name: 'description', type: 'text', placeholder: 'Send us a message and we will respond shortly.' },
      { name: 'emailRecipient', type: 'text', placeholder: 'leads@zenith.io' },
      { name: 'submitButtonText', type: 'text', placeholder: 'Send Message' }
    ],
    defaultContent: {
      title: 'Initiate Contact',
      description: 'Send us a message and we will respond shortly.',
      emailRecipient: 'leads@zenith.io',
      submitButtonText: 'Send Message'
    }
  },
  {
    type: 'socialShare',
    iconName: 'Users',
    title: 'Social Links',
    description: 'Social media link bar',
    category: 'Social',
    fields: [
      { name: 'heading', type: 'text', placeholder: 'Connect with our networks' },
      {
        name: 'platforms',
        type: 'array',
        fields: [
          {
            name: 'platform',
            type: 'select',
            options: [
              { label: 'Twitter/X', value: 'twitter' },
              { label: 'Facebook', value: 'facebook' },
              { label: 'LinkedIn', value: 'linkedin' },
              { label: 'GitHub', value: 'github' },
              { label: 'YouTube', value: 'youtube' }
            ],
            placeholder: 'Select Platform'
          },
          { name: 'url', type: 'text', placeholder: 'https://social.com/profile' }
        ]
      }
    ],
    defaultContent: {
      heading: 'Connect with our networks',
      platforms: [
        { platform: 'twitter', url: 'https://twitter.com/zenithcms' },
        { platform: 'github', url: 'https://github.com/zenithcms' }
      ]
    }
  },
  {
    type: 'pageTitle',
    iconName: 'Type',
    title: 'Page Title',
    description: 'Page-level title field',
    category: 'General',
    fields: [
      { name: 'title', type: 'text', placeholder: 'Page Title' },
    ],
    defaultContent: { title: '' },
  },
  {
    type: 'pageDescription',
    iconName: 'FileText',
    title: 'Page Description',
    description: 'Page-level description field',
    category: 'General',
    fields: [
      { name: 'description', type: 'richtext', placeholder: 'Page description...' },
      {
        name: 'inlineWidgets',
        type: 'dz',
        label: 'Inline Widgets',
        components: ['callout', 'code', 'table'],
      },
    ],
    defaultContent: { description: '', inlineWidgets: [] },
  }
]

export const UNIFIED_BLOCK_LIBRARY: UnifiedBlockDefinition[] = BASE_BLOCK_LIBRARY.map(block => ({
  ...block,
  fields: [...block.fields, ...STANDARD_STYLE_FIELDS],
  defaultContent: { ...block.defaultContent, ...STANDARD_STYLE_DEFAULTS }
}))
