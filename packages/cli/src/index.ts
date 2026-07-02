#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import path from 'path'
import { execSync } from 'child_process'
import fs from 'fs'
import readline from 'readline'

const question = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  )
}

const program = new Command()


/**
 * Zenith CMS CLI
 * ─────────────
 * The official command-line tool for managing Zenith CMS.
 */

program.name('zenithcms').description('Official Zenith CMS CLI').version('0.1.0')

program
  .command('start')
  .description('Start the Zenith CMS server')
  .option('-p, --port <number>', 'Port to run on', '4001')
  .action((options) => {
    console.log(chalk.bold.hex('#00F5FF')(' Zenith CMS starting on port ' + options.port))

    // In a real environment, this would run the server.ts from the installed package
    // For this monorepo, we'll simulate the startup
    try {
      execSync('npx tsx server.ts', { stdio: 'inherit' })
    } catch (err) {
      process.exit(1)
    }
  })

program
  .command('generate-types')
  .description('Generate TypeScript types from zenith.config.ts')
  .option('-o, --output <path>', 'Output file path', 'zenith-types.d.ts')
  .action(async (options) => {
    console.log(chalk.bold.hex('#00F5FF')(' Analyzing schema and generating types...'))

    try {
      let configPath = path.join(process.cwd(), 'zenith.config.ts')
      if (!fs.existsSync(configPath)) {
        configPath = path.join(process.cwd(), 'cms.config.ts')
      }
      if (!fs.existsSync(configPath)) {
        console.error(chalk.red('Error: Neither zenith.config.ts nor cms.config.ts was found in current directory'))
        return
      }

      // Execute a tsx eval to parse the config typescript file cleanly
      const evalScript = `import config from '${configPath.replace(/\\/g, '/')}'; console.log(JSON.stringify(config));`
      const jsonOutput = execSync(`npx tsx -e "${evalScript}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
      const config = JSON.parse(jsonOutput)

      const mapRawFieldType = (field: any): string => {
        switch (field.type) {
          case 'text':
          case 'textarea':
          case 'email':
          case 'url':
            if (field.options && field.options.length > 0) {
              return field.options
                .map((o: any) => (typeof o === 'string' ? `'${o}'` : `'${o.value}'`))
                .join(' | ')
            }
            return 'string'
          case 'number':
            return 'number'
          case 'checkbox':
          case 'boolean':
            return 'boolean'
          case 'date':
            return 'string | Date'
          case 'json':
            return 'Record<string, unknown>'
          case 'media':
            return field.hasMany ? '{ url: string; alt?: string }[]' : '{ url: string; alt?: string }'
          case 'relation': {
            const target = field.relationTo ? capitalize(field.relationTo) : 'any'
            return field.required ? target : `${target} | null`
          }
          case 'group':
            if (!field.fields) return 'Record<string, unknown>'
            return `{\n${field.fields
              .map((f: any) => `    ${f.name}${f.required ? '' : '?'}: ${mapFieldToType(f)};`)
              .join('\n')}\n  }`
          case 'array':
            if (!field.fields) return 'any[]'
            return `{\n${field.fields
              .map((f: any) => `    ${f.name}${f.required ? '' : '?'}: ${mapFieldToType(f)};`)
              .join('\n')}\n  }[]`
          case 'blocks': {
            if (!field.blocks || field.blocks.length === 0) return 'any[]'
            const blockUnions = field.blocks.map((b: any) => {
              const blockFields = b.fields
                ? b.fields
                    .map(
                      (f: any) => `    ${f.name}${f.required ? '' : '?'}: ${mapFieldToType(f)};`
                    )
                    .join('\n')
                : ''
              return `{\n    blockType: '${b.slug}';\n${blockFields}\n  }`
            })
            return `(${blockUnions.join(' | ')})[]`
          }
          default:
            return 'any'
        }
      }

      const mapFieldToType = (field: any): string => {
        if (field.localized) {
          return `Record<string, ${mapRawFieldType(field)}>`
        }
        return mapRawFieldType(field)
      }

      const capitalize = (str: string): string => {
        return str
          .split(/[-_\s]+/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('')
      }

      let output = `/**\n * Zenith Auto-Generated TypeScript Definitions\n * Generated via "zenith generate-types"\n * DO NOT MODIFY MANUALLY.\n */\n\n`

      output += `export interface ZenithDocument {\n  _id: string;\n  createdAt: string;\n  updatedAt: string;\n  status?: 'draft' | 'published';\n}\n\n`

      const collections = config.collections || []
      const globals = config.globals || []

      // 1. Generate Core Interfaces for Collections
      for (const col of collections) {
        const interfaceName = capitalize(col.slug)
        output += `export interface ${interfaceName} extends ZenithDocument {\n`
        for (const field of col.fields || []) {
          const typeStr = mapFieldToType(field)
          const isOptional = !field.required
          output += `  ${field.name}${isOptional ? '?' : ''}: ${typeStr};\n`
        }
        output += `}\n\n`
      }

      // 2. Generate Core Interfaces for Globals
      for (const glob of globals) {
        const interfaceName = capitalize(glob.slug)
        output += `export interface ${interfaceName} {\n`
        for (const field of glob.fields || []) {
          const typeStr = mapFieldToType(field)
          const isOptional = !field.required
          output += `  ${field.name}${isOptional ? '?' : ''}: ${typeStr};\n`
        }
        output += `}\n\n`
      }

      // 3. Generate Zenith Schema collections register
      output += `export interface ZenithSchema {\n`
      output += `  collections: {\n`
      for (const col of collections) {
        output += `    ${col.slug}: ${capitalize(col.slug)}[];\n`
      }
      output += `  };\n`
      output += `  globals: {\n`
      for (const glob of globals) {
        output += `    '${glob.slug}': ${capitalize(glob.slug)};\n`
      }
      output += `  };\n`
      output += `}\n`

      fs.writeFileSync(path.join(process.cwd(), options.output), output)
      console.log(chalk.green(` Types generated successfully at ${options.output}`))
    } catch (err: unknown) {
      console.error(chalk.red(`Error: ${(err as Error).message}`))
    }
  })

program
  .command('init')
  .description('Initialize a new Zenith CMS project')
  .action(() => {
    console.log(chalk.bold.hex('#00F5FF')('️  Initializing Zenith CMS project...'))

    const configContent = `import type { CMSConfig } from '@zenith-open/zenithcms-types';

const config: CMSConfig = {
  collections: [
    {
      name: 'Post',
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richtext' },
      ],
    }
  ]
};

export default config;`

    fs.writeFileSync(path.join(process.cwd(), 'zenith.config.ts'), configContent)
    console.log(chalk.green(' Created zenith.config.ts'))
    console.log(chalk.gray('\nNext steps:'))
    console.log(chalk.white('1. Run ') + chalk.bold('zenith start'))
  })

program
  .command('export-schema')
  .description('Export CMS collection schemas to a JSON file')
  .option('-o, --output <path>', 'Output schema file path', 'zenith-schema.json')
  .action((options) => {
    console.log(chalk.bold.hex('#00F5FF')(' Exporting schema configurations...'))

    try {
      let configPath = path.join(process.cwd(), 'zenith.config.ts')
      if (!fs.existsSync(configPath)) {
        configPath = path.join(process.cwd(), 'cms.config.ts')
      }
      if (!fs.existsSync(configPath)) {
        console.error(chalk.red('Error: Neither zenith.config.ts nor cms.config.ts was found in current directory'))
        return
      }

      const evalScript = `import config from '${configPath.replace(/\\/g, '/')}'; console.log(JSON.stringify(config));`
      const jsonOutput = execSync(`npx tsx -e "${evalScript}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
      const config = JSON.parse(jsonOutput)

      const outputData = {
        collections: config.collections || [],
        globals: config.globals || [],
        exportedAt: new Date().toISOString()
      }

      fs.writeFileSync(path.resolve(process.cwd(), options.output), JSON.stringify(outputData, null, 2), 'utf-8')
      console.log(chalk.green(` Schema exported successfully to ${options.output}`))
    } catch (err: unknown) {
      console.error(chalk.red(`Error exporting schema: ${(err as Error).message}`))
    }
  })

program
  .command('export-data')
  .description('Export CMS collection data to JSON files')
  .option('-o, --output-dir <path>', 'Output directory path', 'zenith-export')
  .action((options) => {
    console.log(chalk.bold.hex('#00F5FF')(' Starting CMS database data export...'))

    try {
      let configPath = path.join(process.cwd(), 'zenith.config.ts')
      if (!fs.existsSync(configPath)) {
        configPath = path.join(process.cwd(), 'cms.config.ts')
      }
      if (!fs.existsSync(configPath)) {
        console.error(chalk.red('Error: Neither zenith.config.ts nor cms.config.ts was found in current directory'))
        return
      }

      const tempRunnerPath = path.join(process.cwd(), '.zenith-export-runner.ts')
      
      const runnerContent = `
import * as path from 'path'
import * as fs from 'fs'
import 'dotenv/config'
import { AdapterFactory } from './packages/core/src/database/adapters/AdapterFactory'
import config from '${configPath.replace(/\\/g, '/')}'

async function run() {
  const outputDir = path.resolve(process.cwd(), '${options.outputDir.replace(/\\/g, '/')}')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log('Connecting to database adapter...')
  const adapter = AdapterFactory.create()
  await adapter.connect()

  const collections = [...(config.collections || [])]
  try {
    const dbCollections = await adapter.find<Record<string, unknown>>('z_collections', {})
    for (const col of dbCollections) {
      if (!collections.find(c => c.slug === col.slug)) {
        collections.push(col)
      }
    }
  } catch (err) {
    // Ignore if z_collections isn't created yet
  }

  const systemSlugs = ['users', 'flows', 'z_api_keys', 'z_collections', 'audit_logs', 'versions', 'z_webhook_deliveries']
  for (const slug of systemSlugs) {
    if (!collections.find(c => c.slug === slug)) {
      collections.push({ slug, name: slug } as any)
    }
  }

  for (const col of collections) {
    try {
      const docs = await adapter.find(col.slug, {}, { limit: 100000 })
      const filePath = path.join(outputDir, \`\${col.slug}.json\`)
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8')
      console.log(\` Exported \${docs.length} documents for collection: \${col.slug}\`)
    } catch (err: unknown) {
      console.warn(\`️ Skipping or failed to export collection \${col.slug}: \${(err as Error).message}\`)
    }
  }

  await adapter.disconnect()
  console.log('Database export completed successfully!')
}

run().catch(err => {
  console.error('Export run error:', err)
  process.exit(1)
})
`
      fs.writeFileSync(tempRunnerPath, runnerContent, 'utf-8')
      
      try {
        execSync(`npx tsx .zenith-export-runner.ts`, { stdio: 'inherit' })
      } finally {
        if (fs.existsSync(tempRunnerPath)) {
          fs.unlinkSync(tempRunnerPath)
        }
      }
    } catch (err: unknown) {
      console.error(chalk.red(`Error exporting data: ${(err as Error).message}`))
    }
  })

program
  .command('migration:generate')
  .argument('[name]', 'Migration name identifier', 'auto')
  .description('Generate SQL schema migrations based on zenith.config.ts changes')
  .action((name) => {
    console.log(chalk.bold.hex('#00F5FF')('️  Analyzing schema diffs and compiling SQL migration...'))

    try {
      let configPath = path.join(process.cwd(), 'zenith.config.ts')
      if (!fs.existsSync(configPath)) {
        configPath = path.join(process.cwd(), 'cms.config.ts')
      }
      if (!fs.existsSync(configPath)) {
        console.error(chalk.red('Error: Neither zenith.config.ts nor cms.config.ts was found in current directory'))
        return
      }

      const tempRunnerPath = path.join(process.cwd(), '.zenith-migration-gen-runner.ts')
      const runnerContent = `
import * as path from 'path'
import * as fs from 'fs'
import 'dotenv/config'
import { AdapterFactory } from './packages/core/src/database/adapters/AdapterFactory'
import config from '${configPath.replace(/\\/g, '/')}'
import { sql } from 'drizzle-orm'

async function run() {
  const dbType = process.env.DATABASE_TYPE || 'mongodb'
  if (dbType !== 'postgres') {
    console.log('Database type is MongoDB. Migrations are only required for SQL databases (Postgres). Mongoose validates dynamic schemas automatically at boot.')
    return
  }

  console.log('Connecting to database adapter...')
  const adapter = AdapterFactory.create()
  await adapter.connect()

  const existingTablesResult = await adapter.db.execute(
    sql\`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'\`
  )
  const existingTables = (existingTablesResult.rows || []).map((r: Record<string, unknown>) => r.table_name)

  const collections = config.collections || []
  let upSql = ''

  const mapFieldToSqlType = (field: any): string => {
    if (field.localized) return 'JSONB'
    switch (field.type) {
      case 'number': return 'INTEGER'
      case 'checkbox':
      case 'boolean': return 'BOOLEAN'
      case 'date': return 'TIMESTAMP'
      case 'json':
      case 'array':
      case 'group':
      case 'blocks': return 'JSONB'
      case 'relation': return field.hasMany ? 'JSONB' : 'TEXT'
      default: return 'TEXT'
    }
  }

  for (const col of collections) {
    const tableExists = existingTables.includes(col.slug)
    if (!tableExists) {
      let createSql = \`CREATE TABLE IF NOT EXISTS "\${col.slug}" (\\n  "id" TEXT PRIMARY KEY,\\n  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,\\n  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL\`
      if (col.drafts) {
        createSql += \`,\\n  "status" TEXT DEFAULT 'published'\`
      }
      for (const field of col.fields || []) {
        if (field.type === 'relation' && field.junctionTable) continue
        const sqlType = mapFieldToSqlType(field)
        createSql += \`,\\n  "\${field.name}" \${sqlType}\`
        if (field.unique) createSql += ' UNIQUE'
        if (field.required) createSql += ' NOT NULL'
      }
      createSql += \`\\n);\`
      upSql += createSql + '\\n'

      for (const field of col.fields || []) {
        if (field.type === 'relation' && field.junctionTable) continue
        if (field.unique || field.index || field.indexed || field.searchable) {
          const idxName = \`idx_\${col.slug}_\${field.name}\`
          const isGin = field.localized || ['json', 'array', 'group', 'blocks'].includes(field.type)
          if (isGin) {
            upSql += \`CREATE INDEX IF NOT EXISTS "\${idxName}" ON "\${col.slug}" USING gin ("\${field.name}");\\n\`
          } else {
            upSql += \`CREATE INDEX IF NOT EXISTS "\${idxName}" ON "\${col.slug}" ("\${field.name}");\\n\`
          }
        }
      }
    } else {
      const colsResult = await adapter.db.execute(
        sql\`SELECT column_name FROM information_schema.columns WHERE table_name = \${col.slug}\`
      )
      const existingCols = (colsResult.rows || []).map((r: Record<string, unknown>) => r.column_name)

      for (const field of col.fields || []) {
        if (field.type === 'relation' && field.junctionTable) continue
        if (!existingCols.includes(field.name)) {
          const sqlType = mapFieldToSqlType(field)
          let alterSql = \`ALTER TABLE "\${col.slug}" ADD COLUMN "\${field.name}" \${sqlType}\`
          if (field.unique) alterSql += ' UNIQUE'
          if (field.required) alterSql += ' NOT NULL'
          upSql += alterSql + ';\\n'

          if (field.unique || field.index || field.indexed || field.searchable) {
            const idxName = \`idx_\${col.slug}_\${field.name}\`
            const isGin = field.localized || ['json', 'array', 'group', 'blocks'].includes(field.type)
            if (isGin) {
              upSql += \`CREATE INDEX IF NOT EXISTS "\${idxName}" ON "\${col.slug}" USING gin ("\${field.name}");\\n\`
            } else {
              upSql += \`CREATE INDEX IF NOT EXISTS "\${idxName}" ON "\${col.slug}" ("\${field.name}");\\n\`
            }
          }
        }
      }
    }
  }

  // Generate SQL for junction tables
  for (const col of collections) {
    for (const field of col.fields || []) {
      if (field.type === 'relation' && field.junctionTable) {
        const jTable = field.junctionTable
        const tableExists = existingTables.includes(jTable)
        if (!tableExists) {
          let createJunctionSql = \`CREATE TABLE IF NOT EXISTS "\${jTable}" (\\n  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  "source_id" TEXT NOT NULL,\\n  "target_id" TEXT NOT NULL\`
          const pivotFields = field.pivotFields || []
          for (const pf of pivotFields) {
            const sqlType = mapFieldToSqlType(pf)
            createJunctionSql += \`,\\n  "\${pf.name}" \${sqlType}\`
            if (pf.unique) createJunctionSql += ' UNIQUE'
            if (pf.required) createJunctionSql += ' NOT NULL'
          }
          createJunctionSql += \`\\n);\\n\`
          upSql += createJunctionSql
          upSql += \`CREATE INDEX IF NOT EXISTS "idx_\${jTable}_source_id" ON "\${jTable}" ("source_id");\\n\`
          upSql += \`CREATE INDEX IF NOT EXISTS "idx_\${jTable}_target_id" ON "\${jTable}" ("target_id");\\n\`
        } else {
          const jColsResult = await adapter.db.execute(
            sql\`SELECT column_name FROM information_schema.columns WHERE table_name = \${jTable}\`
          )
          const existingJCols = (jColsResult.rows || []).map((r: Record<string, unknown>) => r.column_name)
          const pivotFields = field.pivotFields || []
          for (const pf of pivotFields) {
            if (!existingJCols.includes(pf.name)) {
              const sqlType = mapFieldToSqlType(pf)
              let alterJ = \`ALTER TABLE "\${jTable}" ADD COLUMN "\${pf.name}" \${sqlType}\`
              if (pf.unique) alterJ += ' UNIQUE'
              if (pf.required) alterJ += ' NOT NULL'
              upSql += alterJ + ';\\n'
            }
          }
        }
      }
    }
  }

  await adapter.disconnect()

  if (!upSql.trim()) {
    console.log('No schema changes detected. Database is up to date.')
    return
  }

  const migrationsDir = path.resolve(process.cwd(), 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const cleanName = '${name}'.replace(/[^a-zA-Z0-9_]/g, '_')
  const filename = \`\${timestamp}_\${cleanName}.sql\`
  const filePath = path.join(migrationsDir, filename)

  fs.writeFileSync(filePath, upSql, 'utf-8')
  console.log(\` Generated migration file: migrations/\${filename}\`)
}

run().catch(err => {
  console.error('Migration generation failed:', err)
  process.exit(1)
})
`
      fs.writeFileSync(tempRunnerPath, runnerContent, 'utf-8')
      try {
        execSync(`npx tsx .zenith-migration-gen-runner.ts`, { stdio: 'inherit' })
      } finally {
        if (fs.existsSync(tempRunnerPath)) {
          fs.unlinkSync(tempRunnerPath)
        }
      }
    } catch (err: unknown) {
      console.error(chalk.red(`Error generating migration: ${(err as Error).message}`))
    }
  })

program
  .command('migration:run')
  .description('Run all pending SQL database migrations')
  .action(() => {
    console.log(chalk.bold.hex('#00F5FF')(' Executing pending migrations...'))

    try {
      const tempRunnerPath = path.join(process.cwd(), '.zenith-migration-run-runner.ts')
      const runnerContent = `
import * as path from 'path'
import * as fs from 'fs'
import 'dotenv/config'
import { AdapterFactory } from './packages/core/src/database/adapters/AdapterFactory'
import { sql } from 'drizzle-orm'

async function run() {
  const dbType = process.env.DATABASE_TYPE || 'mongodb'
  if (dbType !== 'postgres') {
    console.log('Database type is MongoDB. Schema migrations are not required for MongoDB.')
    return
  }

  console.log('Connecting to database adapter...')
  const adapter = AdapterFactory.create()
  await adapter.connect()

  await adapter.db.execute(sql\`
    CREATE TABLE IF NOT EXISTS z_migrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT UNIQUE NOT NULL,
      batch INTEGER NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  \`)

  const rows = await adapter.db.execute(sql\`SELECT name FROM z_migrations\`)
  const applied = (rows.rows || []).map((r: Record<string, unknown>) => r.name)

  const migrationsDir = path.resolve(process.cwd(), 'migrations')
  if (!fs.existsSync(migrationsDir) || fs.readdirSync(migrationsDir).length === 0) {
    console.log('No migrations found in migrations directory.')
    await adapter.disconnect()
    return
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const pending = files.filter(f => !applied.includes(f))

  if (pending.length === 0) {
    console.log('No pending migrations to run. Database is already up to date.')
    await adapter.disconnect()
    return
  }

  const batchRes = await adapter.db.execute(sql\`SELECT MAX(batch) as max_batch FROM z_migrations\`)
  const maxBatch = (batchRes.rows || [])[0]?.max_batch || 0
  const nextBatch = Number(maxBatch) + 1

  console.log(\`Found \${pending.length} pending migration(s) to execute in batch \${nextBatch}.\`)

  for (const filename of pending) {
    console.log(\`Executing migration: \${filename}...\`)
    const fileContent = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8')
    if (fileContent.trim()) {
      await adapter.db.execute(sql.raw(fileContent))
    }
    await adapter.db.execute(sql\`
      INSERT INTO z_migrations (name, batch) 
      VALUES (\${filename}, \${nextBatch})
    \`)
    console.log(\` Applied \${filename}\`)
  }

  await adapter.disconnect()
  console.log('All migrations completed successfully!')
}

run().catch(err => {
  console.error('Migration run failed:', err)
  process.exit(1)
})
`
      fs.writeFileSync(tempRunnerPath, runnerContent, 'utf-8')
      try {
        execSync(`npx tsx .zenith-migration-run-runner.ts`, { stdio: 'inherit' })
      } finally {
        if (fs.existsSync(tempRunnerPath)) {
          fs.unlinkSync(tempRunnerPath)
        }
      }
    } catch (err: unknown) {
      console.error(chalk.red(`Error running migrations: ${(err as Error).message}`))
    }
  })

program
  .command('migration:status')
  .description('Display status of all migrations')
  .action(() => {
    console.log(chalk.bold.hex('#00F5FF')(' Checking database migrations status...'))

    try {
      const tempRunnerPath = path.join(process.cwd(), '.zenith-migration-status-runner.ts')
      const runnerContent = `
import * as path from 'path'
import * as fs from 'fs'
import 'dotenv/config'
import { AdapterFactory } from './packages/core/src/database/adapters/AdapterFactory'
import { sql } from 'drizzle-orm'

async function run() {
  const dbType = process.env.DATABASE_TYPE || 'mongodb'
  if (dbType !== 'postgres') {
    console.log('Database type is MongoDB. Schema migrations are not applicable.')
    return
  }

  console.log('Connecting to database adapter...')
  const adapter = AdapterFactory.create()
  await adapter.connect()

  let applied: string[] = []
  try {
    const rows = await adapter.db.execute(sql\`SELECT name FROM z_migrations\`)
    applied = (rows.rows || []).map((r: Record<string, unknown>) => r.name)
  } catch (err) {
    // z_migrations does not exist yet
  }

  const migrationsDir = path.resolve(process.cwd(), 'migrations')
  const localFiles = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    : []

  console.log('\\n' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Zenith CMS Database Migrations Status')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (localFiles.length === 0) {
    console.log('  No migrations found on disk.')
    await adapter.disconnect()
    return
  }

  for (const file of localFiles) {
    const isApplied = applied.includes(file)
    const statusText = isApplied ? '\\x1b[32mApplied\\x1b[0m' : '\\x1b[33mPending\\x1b[0m'
    console.log(\`  [\${statusText}]  \${file}\`)
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n')

  await adapter.disconnect()
}

run().catch(err => {
  console.error('Migration status check failed:', err)
  process.exit(1)
})
`
      fs.writeFileSync(tempRunnerPath, runnerContent, 'utf-8')
      try {
        execSync(`npx tsx .zenith-migration-status-runner.ts`, { stdio: 'inherit' })
      } finally {
        if (fs.existsSync(tempRunnerPath)) {
          fs.unlinkSync(tempRunnerPath)
        }
      }
    } catch (err: unknown) {
      console.error(chalk.red(`Error displaying migration status: ${(err as Error).message}`))
    }
  })

program
  .command('create-plugin')
  .description('Scaffold a new Zenith CMS plugin')
  .argument('[name]', 'Plugin name (e.g. acme-analytics)')
  .option('-d, --dir <path>', 'Output directory', '.')
  .action(async (nameArg, options) => {
    console.log(chalk.bold.hex('#8B5CF6')('\n Zenith CMS Plugin Scaffold\n'))

    let pluginName = nameArg
    if (!pluginName) {
      pluginName = await question(chalk.white('? ') + chalk.bold('Plugin name (slug): ') + chalk.gray('(my-plugin) '))
      if (!pluginName) pluginName = 'my-plugin'
    }

    // Normalize: lowercase, hyphens only
    const slug = pluginName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const packageName = `zenith-plugin-${slug}`
    const className = slug.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')

    const targetDir = path.resolve(options.dir, packageName)
    if (fs.existsSync(targetDir)) {
      console.error(chalk.red(`\n Error: Directory "${packageName}" already exists.\n`))
      process.exit(1)
    }

    fs.mkdirSync(targetDir, { recursive: true })

    // package.json
    fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify({
      name: packageName,
      version: '0.1.0',
      description: `${className} plugin for Zenith CMS`,
      type: 'module',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: { build: 'tsc' },
      peerDependencies: { '@zenith-open/zenithcms-core': '^0.2.0', '@zenith-open/zenithcms-types': '^0.2.0' },
      keywords: ['zenithcms', 'zenith', 'plugin', slug],
    }, null, 2))

    // tsconfig.json
    fs.writeFileSync(path.join(targetDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext',
        declaration: true, strict: true, outDir: './dist', rootDir: './src',
        esModuleInterop: true, skipLibCheck: true,
      },
      include: ['src'],
    }, null, 2))

    // src/index.ts — plugin source
    fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true })
    fs.writeFileSync(path.join(targetDir, 'src/index.ts'), `import type { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'

export interface ${className}Options {
  /** Enable verbose logging */
  debug?: boolean
}

/**
 * ${className} Plugin for Zenith CMS
 *
 * Hooks into content lifecycle events to extend CMS behavior.
 * See: https://zenithcms.com/docs/plugins
 */
export function ${slug.replace(/-/g, '')}Plugin(options: ${className}Options = {}): ZenithPlugin {
  return {
    id: '${slug}',
    name: '${className}',
    version: '0.1.0',
    description: '${className} plugin for Zenith CMS',
    enabled: true,

    configSchema: {
      debug: {
        type: 'boolean',
        label: 'Debug Mode',
        description: 'Enable verbose logging for this plugin',
        default: false,
      },
    },

    config: options,

    // ── Config Phase: Modify CMS config before engine starts ───────
    apply(config, pluginConfig) {
      if (pluginConfig?.debug) {
        console.log('[${className}] Plugin applied with config:', pluginConfig)
      }
      return config
    },

    // ── Init Phase: Register hooks after engine boots ──────────────
    onInit(ctx: PluginContext) {
      ctx.logger.info('${className} plugin initialized')

      // Example: Hook into content creation across all collections
      ctx.hooks.on('content:*:afterCreate', (doc: Record<string, unknown>) => {
        if (options.debug) {
          ctx.logger.debug({ collection: doc?.collection }, 'Content created')
        }
      })

      // Example: Hook into content updates for a specific collection
      // ctx.hooks.on('content:posts:afterUpdate', (payload: any) => {
      //   ctx.logger.info({ docId: payload?.doc?._id }, 'Post updated')
      // })
    },

    // ── Ready Phase: DB is connected, routes are live ──────────────
    async onReady(ctx: PluginContext) {
      // Register custom Express routes, set up DB-dependent resources, etc.
      ctx.logger.info('${className} plugin ready')
    },

    // ── Destroy Phase: Clean up on shutdown ────────────────────────
    async onDestroy(ctx: PluginContext) {
      ctx.logger.info('${className} plugin shutting down')
    },
  }
}

export default ${slug.replace(/-/g, '')}Plugin
`)

    // README.md
    fs.writeFileSync(path.join(targetDir, 'README.md'), `# ${packageName}

${className} plugin for Zenith CMS.

## Installation

\`\`\`bash
npm install ${packageName}
\`\`\`

## Usage

In your \`zenith.config.ts\`:

\`\`\`ts
import { ${slug.replace(/-/g, '')}Plugin } from '${packageName}'

export default {
  // ... your config
  plugins: [
    ${slug.replace(/-/g, '')}Plugin({ debug: true }),
  ],
}
\`\`\`

## Hooks

This plugin hooks into the following lifecycle events:

- \`content:*:afterCreate\` — Fires after any document is created
- \`content:*:afterUpdate\` — Fires after any document is updated
- \`content:*:afterDelete\` — Fires after any document is deleted
- \`content:*:afterRead\` — Fires after any document is read

## License

MIT
`)

    console.log(chalk.green(` Plugin scaffolded: ${packageName}/`))
    console.log(chalk.gray(`  src/index.ts    — Plugin source`))
    console.log(chalk.gray(`  package.json    — npm package config`))
    console.log(chalk.gray(`  tsconfig.json   — TypeScript config`))
    console.log(chalk.gray(`  README.md       — Documentation`))
    console.log(chalk.cyan(`\nNext steps:`))
    console.log(chalk.white(`  cd ${packageName}`))
    console.log(chalk.white(`  npm install`))
    console.log(chalk.white(`  npm run build`))
    console.log('')
  })

program
  .command('sync:blocks')
  .description('Sync manually edited block schema (.ts) files to the database')
  .action(() => {
    console.log(chalk.bold.hex('#00F5FF')(' Syncing local block schemas to database...'))

    try {
      const tempRunnerPath = path.join(process.cwd(), '.zenith-sync-blocks-runner.ts')
      const runnerContent = `
import * as path from 'path'
import * as fs from 'fs'
import { pathToFileURL } from 'url'
import 'dotenv/config'
import { AdapterFactory } from './packages/core/src/database/adapters/AdapterFactory'
import './packages/core/src/database/schema-model'

async function run() {
  const blocksDir = path.resolve(process.cwd(), 'config', 'blocks')
  if (!fs.existsSync(blocksDir)) {
    console.log('No config/blocks directory found. Nothing to sync.')
    return
  }

  const files = fs.readdirSync(blocksDir).filter(f => f.endsWith('.json'))
  if (files.length === 0) {
    console.log('No .json block files found in config/blocks.')
    return
  }

  console.log('Connecting to database adapter...')
  const adapter = AdapterFactory.create()
  await adapter.connect()

  let syncedCount = 0

  for (const file of files) {
    const filePath = path.join(blocksDir, file)
    try {
      // Dynamically import the TS file using file URL
      const blockModule = await import(pathToFileURL(filePath).href)
      
      // The block is usually exported as a named export matching the slug, or default.
      // We'll iterate through exports to find the BlockDefinition.
      let blockDef = null
      for (const key in blockModule) {
        if (blockModule[key] && blockModule[key].slug && blockModule[key].fields) {
          blockDef = blockModule[key]
          break
        }
      }

      if (!blockDef) {
        console.warn(\`️ Skipped \${file}: No valid block definition found (missing slug or fields).\`)
        continue
      }

      // Upsert into z_schemas
      const dbPayload = {
        title: blockDef.labels?.singular || blockDef.title || blockDef.slug,
        slug: blockDef.slug,
        type: 'block',
        isGlobal: false,
        fields: blockDef.fields || [],
        siteId: null, // Blocks from FS are currently global
        admin: blockDef.admin || { category: 'General', icon: 'Box' }
      }

      const existing = await adapter.findOne('z_schemas', { slug: blockDef.slug, siteId: null })
      if (existing) {
        await adapter.update('z_schemas', (existing._id || existing.id).toString(), dbPayload)
      } else {
        await adapter.create('z_schemas', dbPayload)
      }
      
      console.log(\` Synced block: \${blockDef.slug}\`)
      syncedCount++
    } catch (err: unknown) {
      console.error(\` Failed to sync \${file}: \${(err as Error).message}\`)
    }
  }

  await adapter.disconnect()
  console.log(\`\\n Successfully synced \${syncedCount} block(s) to the database!\`)
}

run().catch(err => {
  console.error('Sync error:', err)
  process.exit(1)
})
`
      fs.writeFileSync(tempRunnerPath, runnerContent, 'utf-8')
      try {
        execSync('npx tsx .zenith-sync-blocks-runner.ts', { stdio: 'inherit' })
      } finally {
        if (fs.existsSync(tempRunnerPath)) {
          fs.unlinkSync(tempRunnerPath)
        }
      }
    } catch (err: unknown) {
      console.error(chalk.red(`Error syncing blocks: ${(err as Error).message}`))
    }
  })

program.parse()
