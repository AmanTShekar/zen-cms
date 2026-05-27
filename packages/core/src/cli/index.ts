#!/usr/bin/env tsx
import { Command } from 'commander'
import path from 'path'
import { ZenithEngine } from '../index'
import { SchemaSync } from '../database/sync'
import { MigrationManager } from '../migrations/manager'
import { BackupService } from '../services/backup'
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

program
  .command('migration:rollback')
  .description('Roll back the most recent batch of database migrations')
  .option('-s, --steps <number>', 'Number of batches to roll back', '1')
  .option('-c, --config <path>', 'Path to cms.config.ts', 'cms.config.ts')
  .action(async (options) => {
    try {
      const configPath = path.resolve(process.cwd(), options.config)
      const { default: config } = await import(configPath)

      const engine = new ZenithEngine({ config })
      await engine.adapter.connect()

      const count = await MigrationManager.rollback([], parseInt(options.steps))
      if (count > 0) {
        console.log(`\n✅ Rolled back ${count} migration(s).\n`)
      } else {
        console.log('\n✅ Nothing to roll back.\n')
      }
      process.exit(0)
    } catch (err: any) {
      logger.error({ err: err.message }, 'CLI rollback failed')
      process.exit(1)
    }
  })

program
  .command('backup:export')
  .description('Export all collections to a JSON backup file')
  .option('-o, --output <dir>', 'Output directory for the backup file', './backups')
  .option('-c, --config <path>', 'Path to cms.config.ts', 'cms.config.ts')
  .option('--include-system', 'Include system collections (z_ prefix)')
  .action(async (options) => {
    try {
      const configPath = path.resolve(process.cwd(), options.config)
      const { default: config } = await import(configPath)

      const engine = new ZenithEngine({ config })
      await engine.adapter.connect()

      const collectionSlugs = config.collections?.map((c: any) => c.slug) || []
      const result = await BackupService.export(collectionSlugs, options.output, options.includeSystem)

      console.log(`\n✅ Backup complete! ${result.manifest.recordCount} records across ${result.manifest.collections.length} collections.`)
      console.log(`   File written to: ${path.resolve(options.output)}\n`)
      process.exit(0)
    } catch (err: any) {
      logger.error({ err: err.message }, 'CLI backup export failed')
      process.exit(1)
    }
  })

program
  .command('backup:import')
  .description('Import collections from a JSON backup file')
  .requiredOption('-f, --file <path>', 'Path to the backup JSON file')
  .option('-c, --config <path>', 'Path to cms.config.ts', 'cms.config.ts')
  .action(async (options) => {
    try {
      const configPath = path.resolve(process.cwd(), options.config)
      const { default: config } = await import(configPath)

      const engine = new ZenithEngine({ config })
      await engine.adapter.connect()

      const filePath = path.resolve(process.cwd(), options.file)
      const result = await BackupService.import(filePath)

      console.log(`\n✅ Import complete! Restored ${result.restored} records.\n`)
      process.exit(0)
    } catch (err: any) {
      logger.error({ err: err.message }, 'CLI backup import failed')
      process.exit(1)
    }
  })

program
  .command('backup:list')
  .description('List available backup files')
  .option('-d, --dir <path>', 'Backup directory', './backups')
  .action(async (options) => {
    try {
      const dir = path.resolve(process.cwd(), options.dir)
      const backups = await BackupService.list(dir)

      if (backups.length === 0) {
        console.log('\nNo backup files found.\n')
      } else {
        console.log(`\nBackups in ${dir}:`)
        console.log('─'.repeat(70))
        for (const b of backups) {
          const size = (b.size / 1024).toFixed(1)
          console.log(`  ${b.name.padEnd(45)} ${size.padStart(8)} KB  ${b.createdAt.toISOString()}`)
        }
        console.log('')
      }
      process.exit(0)
    } catch (err: any) {
      logger.error({ err: err.message }, 'CLI backup list failed')
      process.exit(1)
    }
  })

program.parse()
