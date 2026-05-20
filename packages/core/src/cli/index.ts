#!/usr/bin/env tsx
import { Command } from 'commander'
import path from 'path'
import { ZenithEngine } from '../index'
import { SchemaSync } from '../database/sync'
import { logger } from '../services/logger'

const program = new Command()

program.name('zenithcms').description('Zenith CMS Management CLI').version('1.0.0')

program
  .command('sync')
  .description('Sync cms.config.ts schema with the database')
  .option('-c, --config <path>', 'Path to cms.config.ts', 'cms.config.ts')
  .action(async (options) => {
    try {
      const configPath = path.resolve(process.cwd(), options.config)
      const { default: config } = await import(configPath)

      const engine = new ZenithEngine({ config })
      await engine.adapter.connect()

      const syncer = new SchemaSync(config, engine.adapter)
      const stats = await syncer.sync()

      console.log(`\n✅ Sync complete! Created/Updated ${stats.updated} collections.\n`)
      process.exit(0)
    } catch (err: any) {
      logger.error({ err: err.message }, 'CLI Sync failed')
      process.exit(1)
    }
  })

program
  .command('diff')
  .description('Report differences between cms.config.ts and the active database')
  .option('-c, --config <path>', 'Path to cms.config.ts', 'cms.config.ts')
  .action(async (options) => {
    try {
      const configPath = path.resolve(process.cwd(), options.config)
      const { default: config } = await import(configPath)

      const engine = new ZenithEngine({ config })
      await engine.adapter.connect()

      const syncer = new SchemaSync(config, engine.adapter)
      const report = await syncer.diff()

      console.log('\n🔍 Zenith Schema Difference Report')
      console.log('==================================')
      if (report.added.length === 0 && report.removed.length === 0) {
        console.log('✅ Database is fully synchronized with cms.config.ts! No differences found.')
      } else {
        if (report.added.length > 0) {
          console.log('\n➕ Missing collections in Database (will be added on sync):')
          report.added.forEach((slug) => console.log(`  - ${slug}`))
        }
        if (report.removed.length > 0) {
          console.log('\n⚠️ Unused collections in Database (not defined in config):')
          report.removed.forEach((slug) => console.log(`  - ${slug}`))
        }
      }
      console.log('')
      process.exit(0)
    } catch (err: any) {
      logger.error({ err: err.message }, 'CLI Diff failed')
      process.exit(1)
    }
  })

program.parse()
