import fs from 'fs'
import path from 'path'
import { logger } from '../src/services/logger'

const MIGRATIONS_DIR = path.resolve(__dirname, '../src/database/migrations')

function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: pnpm run migration:generate <migration_name>')
    process.exit(1)
  }

  const name = args.join('_').replace(/[^a-zA-Z0-9_]/g, '')
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const filename = `${timestamp}_${name}.ts`

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true })
  }

  const content = `import { DatabaseAdapter } from '../adapters/BaseAdapter'

/**
 * Migration: ${name}
 * Generated: ${new Date().toISOString()}
 */

export async function up(adapter: DatabaseAdapter) {
  // Write migration logic here
  // Example Postgres: await (adapter as any).db.execute('ALTER TABLE ...')
  // Example Mongo: await adapter.updateMany('collection', {}, { $set: { ... } })
}

export async function down(adapter: DatabaseAdapter) {
  // Write rollback logic here
}
`

  fs.writeFileSync(path.join(MIGRATIONS_DIR, filename), content)
  logger.info(`Generated migration file: ${filename}`)
}

main()
