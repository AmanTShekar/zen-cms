import fs from 'fs'
import path from 'path'
import { UNIFIED_BLOCK_LIBRARY } from '../../packages/admin/src/pages/editor/unifiedBlocks'

// Blocks needed by storefront App.tsx
const STOREFRONT_BLOCKS = [
  'hero', 'features', 'stats', 'testimonials', 'newsletter',
  'pricing', 'cta', 'richTextSection', 'gallery', 'team', 'faq', 'navbar'
]

const demoJsonPath = path.resolve(__dirname, 'demo.json')

if (fs.existsSync(demoJsonPath)) {
  const demoData = JSON.parse(fs.readFileSync(demoJsonPath, 'utf8'))
  
  const blocks = UNIFIED_BLOCK_LIBRARY.filter(b => STOREFRONT_BLOCKS.includes(b.type)).map(b => ({
    slug: b.type,
    labels: { singular: b.title, plural: b.title + 's' },
    fields: b.fields.map(f => ({
      name: f.name,
      label: f.label || f.name,
      type: f.type,
      required: f.required,
      options: f.options,
      hasMany: f.hasMany,
      components: f.components
    })),
    admin: {
      description: b.description,
      category: b.category,
      icon: b.iconName || 'Box'
    }
  }))

  // Need to also ensure STANDARD_STYLE_FIELDS are added since api/blocks.ts doesn't add them automatically anymore.
  // Actually, wait, do they need STANDARD_STYLE_FIELDS?
  // Let's just add the basic ones.
  const STANDARD_STYLE_FIELDS = [
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

  const enrichedBlocks = blocks.map(b => ({
    ...b,
    fields: [...b.fields, ...STANDARD_STYLE_FIELDS]
  }))

  demoData.blocks = enrichedBlocks

  fs.writeFileSync(demoJsonPath, JSON.stringify(demoData, null, 2))
  console.log('Successfully added blocks to demo.json')
} else {
  console.error('demo.json not found')
}
