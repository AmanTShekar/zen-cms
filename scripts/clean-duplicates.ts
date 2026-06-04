import fs from 'fs'
import path from 'path'

const tenantsDir = path.resolve(__dirname)
const files = fs.readdirSync(tenantsDir).filter(f => f.endsWith('.json'))

for (const file of files) {
  const filePath = path.join(tenantsDir, file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  
  if (data.blocks) {
    for (const block of data.blocks) {
      if (block.fields) {
        // Remove duplicates by name
        const uniqueFields = []
        const seen = new Set()
        for (const f of block.fields) {
          if (!seen.has(f.name)) {
            uniqueFields.push(f)
            seen.add(f.name)
          }
        }
        block.fields = uniqueFields
      }
    }
  }

  // Also check collections, like pages layout block fields if any
  if (data.collections) {
    for (const col of data.collections) {
      if (col.fields) {
         const uniqueFields = []
        const seen = new Set()
        for (const f of col.fields) {
          if (!seen.has(f.name)) {
            uniqueFields.push(f)
            seen.add(f.name)
          }
        }
        col.fields = uniqueFields
      }
    }
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log(`Cleaned ${file}`)
}
