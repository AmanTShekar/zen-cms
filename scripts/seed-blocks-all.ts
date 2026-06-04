import fs from 'fs'
import path from 'path'
import { UNIFIED_BLOCK_LIBRARY } from '../../packages/admin/src/pages/editor/unifiedBlocks'

const tenantsDir = path.resolve(__dirname)
const files = fs.readdirSync(tenantsDir).filter(f => f.endsWith('.json'))

const enrichedBlocks = UNIFIED_BLOCK_LIBRARY.map(b => ({
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

for (const file of files) {
  const filePath = path.join(tenantsDir, file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  data.blocks = enrichedBlocks
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log(`Added blocks to ${file}`)
}
