import React from 'react'
import {
  Star,
  Grid,
  BarChart4,
  MessageSquare,
  Mail,
  CreditCard,
  Zap,
  FileText,
  Layout,
  Users,
} from 'lucide-react'

export interface FieldDefinition {
  name: string
  label?: string
  type: 'text' | 'richtext' | 'media' | 'relation' | 'number' | 'boolean' | 'select' | 'array' | 'group'
    | 'code' | 'collapsible' | 'join' | 'point' | 'radio' | 'row' | 'ui' | 'textarea' | 'checkbox' | 'date'
  fields?: FieldDefinition[]
  options?: (string | { label: string; value: any })[]
  placeholder?: string
  language?: string
  layout?: 'horizontal' | 'vertical'
  hasMany?: boolean
  hasMore?: boolean
  admin?: {
    components?: {
      Field?: React.ComponentType<any>
    }
  }
}

export interface BlockDefinition {
  type: string
  icon: any
  title: string
  description: string
  fields: FieldDefinition[]
  defaultContent: Record<string, any>
}

export const BLOCK_LIBRARY: BlockDefinition[] = [
  {
    type: 'hero',
    icon: Star,
    title: 'Hero Module',
    description: 'Impactful entry with background & CTA',
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
    icon: Grid,
    title: 'Neural Features',
    description: 'Grid-based feature highlighting',
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
    ],
    defaultContent: {
      heading: 'Core Capabilities',
      featureList: [
        { title: 'Velocity', description: 'Near-zero latency lookups.' },
        { title: 'Security', description: 'End-to-end encryption.' },
      ],
    },
  },
  {
    type: 'stats',
    icon: BarChart4,
    title: 'Metric Rails',
    description: 'Data-driven performance metrics',
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
    icon: MessageSquare,
    title: 'Audience Proof',
    description: 'Community validation & quotes',
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
    icon: Mail,
    title: 'Signal Capture',
    description: 'Direct engagement & list growth',
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
    icon: CreditCard,
    title: 'Revenue Matrix',
    description: 'Tier-based pricing structures',
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
    icon: Zap,
    title: 'Action Nexus',
    description: 'High-conversion banner',
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
    icon: FileText,
    title: 'Prose Engine',
    description: 'Rich-text content & articles',
    fields: [
      { name: 'content', type: 'richtext' },
    ],
    defaultContent: {
      content: '<h2>Deep Architecture</h2><p>Refined prose for complex narratives.</p>',
    },
  },
  {
    type: 'gallery',
    icon: Layout,
    title: 'Visual Vault',
    description: 'Grid of images or portfolio items',
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
    icon: Users,
    title: 'Architect Registry',
    description: 'Showcase your core team & collaborators',
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
    icon: MessageSquare,
    title: 'Knowledge Base',
    description: 'Collapsible Q&A section',
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
]

export const humanize = (str: string) => {
  return str
    .replace(/^root:/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
}

export const detectFieldType = (key: string, val: any): string => {
  if (val && typeof val === 'object' && val.url) return 'media'
  if (key.toLowerCase().includes('image')) return 'media'
  if (key.toLowerCase().includes('email')) return 'email'
  if (key.toLowerCase().includes('content') || key.toLowerCase().includes('description') || key.toLowerCase().includes('body')) return 'richtext'
  if (Array.isArray(val)) return 'array'
  if (typeof val === 'object' && val !== null) return 'group'
  if (typeof val === 'number') return 'number'
  if (typeof val === 'boolean') return 'boolean'
  return 'text'
}

export interface Section {
  id: string
  blockType: string
  title: string
  content: any
  align?: 'left' | 'center' | 'right'
}

export interface PageData {
  _status?: 'draft' | 'published'
  title?: string
  heroDescription?: string
  sections: Section[]
  align?: 'left' | 'center' | 'right'
  meta?: Record<string, any>
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
}

