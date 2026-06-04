import fs from 'fs'

const path = 'packages/types/src/generated.ts'
let content = fs.readFileSync(path, 'utf8')

// We will split by lines, and for each interface block, keep track of seen properties.
const lines = content.split('\n')
const output = []
let inInterface = false
let seenProps = new Set()

for (const line of lines) {
  if (line.match(/^export interface \w+ /)) {
    inInterface = true
    seenProps = new Set()
    output.push(line)
    continue
  }
  
  if (inInterface && line.match(/^}/)) {
    inInterface = false
    output.push(line)
    continue
  }
  
  if (inInterface) {
    const propMatch = line.match(/^\s*(\w+)\??:/)
    if (propMatch) {
      const prop = propMatch[1]
      if (seenProps.has(prop)) {
        // Skip duplicate
        continue
      }
      seenProps.add(prop)
    }
  }
  
  output.push(line)
}

fs.writeFileSync(path, output.join('\n'))
console.log('Deduplicated generated.ts')
