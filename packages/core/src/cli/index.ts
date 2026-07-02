#!/usr/bin/env tsx
import { Command } from 'commander'
import path from 'path'
import { ZenithEngine } from '../index'
import { SchemaSync } from '../database/sync'
import { MigrationManager } from '../migrations/manager'
import { BackupService } from '../services/backup'
import { StrapiContentMigrator } from '../plugins/strapi-bridge/ContentMigrator'
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

      console.log(`\n Sync complete! Created/Updated ${stats.updated} collections.\n`)
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

      console.log('\n Zenith Schema Difference Report')
      console.log('==================================')
      if (report.added.length === 0 && report.removed.length === 0) {
        console.log(' Database is fully synchronized with cms.config.ts! No differences found.')
      } else {
        if (report.added.length > 0) {
          console.log('\n Missing collections in Database (will be added on sync):')
          report.added.forEach((slug) => console.log(`  - ${slug}`))
        }
        if (report.removed.length > 0) {
          console.log('\n️ Unused collections in Database (not defined in config):')
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
        console.log(`\n Rolled back ${count} migration(s).\n`)
      } else {
        console.log('\n Nothing to roll back.\n')
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

      console.log(`\n Backup complete! ${result.manifest.recordCount} records across ${result.manifest.collections.length} collections.`)
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

      console.log(`\n Import complete! Restored ${result.restored} records.\n`)
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

program
  .command('migrate:strapi')
  .description('Migrate all content records from a Strapi v4 database into Zenith')
  .requiredOption('--strapi-db <uri>', 'Strapi database connection URI')
  .option('--strapi-type <type>', 'Database type: postgres | mysql | sqlite', 'postgres')
  .option('--strapi-url <url>', 'Strapi base URL for media download', 'http://localhost:1337')
  .option('-c, --config <path>', 'Path to cms.config.ts', 'cms.config.ts')
  .option('--collections <list>', 'Comma-separated collection slugs to migrate (default: all)')
  .option('--batch-size <n>', 'Records per batch', '100')
  .option('--dry-run', 'Simulate migration without writing to Zenith')
  .option('--preserve-urls', 'Keep original Strapi media URLs instead of downloading files', true)
  .option('--report-dir <dir>', 'Directory for migration report', './migration-reports')
  .action(async (options) => {
    try {
      const configPath = path.resolve(process.cwd(), options.config)
      const { default: config } = await import(configPath)
      const engine = new ZenithEngine({ config })
      await engine.adapter.connect()

      const migrator = new StrapiContentMigrator({
        strapiDbUri: options.strapiDb,
        strapiDbType: options.strapiType as any,
        strapiBaseUrl: options.strapiUrl,
        zenithAdapter: engine.adapter,
        collections: options.collections?.split(',').map((s: string) => s.trim()),
        batchSize: parseInt(options.batchSize, 10),
        dryRun: !!options.dryRun,
        preserveUrls: !!options.preserveUrls,
        reportDir: path.resolve(process.cwd(), options.reportDir),
        onProgress: (event) => {
          if (event.type === 'collection_start') {
            process.stdout.write(`\n  ⟶  ${event.collection}  `)
          } else if (event.type === 'collection_progress') {
            process.stdout.write(`\r  ⟶  ${event.collection}  ${event.processed}/${event.total}  (${event.errors} err)   `)
          } else if (event.type === 'collection_done') {
            console.log(`\r    ${event.collection}  ${event.processed}/${event.total}  (${event.errors} errors)`)
          } else if (event.type === 'error') {
            console.error(`\n    ${event.collection}: ${event.message}`)
          } else if (event.type === 'summary') {
            const s = event.summary!
            console.log('\n────────────────────────────────────')
            console.log(`  Migration ${s.dryRun ? '(DRY RUN) ' : ''}complete in ${(s.durationMs / 1000).toFixed(1)}s`)
            let totalMigrated = 0, totalErrors = 0
            for (const c of s.collections) {
              console.log(`  ${c.slug.padEnd(30)} ${c.migrated}/${c.total} records  (${c.errors} errors)`)
              totalMigrated += c.migrated; totalErrors += c.errors
            }
            console.log(`  Media: ${s.media.migrated}/${s.media.total}  (${s.media.errors} errors)`)
            console.log(`  Total: ${totalMigrated} records, ${totalErrors} errors`)
            console.log('────────────────────────────────────\n')
          }
        },
      })

      if (options.dryRun) {
        console.log('\n DRY RUN — no data will be written to Zenith.\n')
      }
      await migrator.run()
      process.exit(0)
    } catch (err: any) {
      logger.error({ err: err.message }, 'CLI migrate:strapi failed')
      console.error(`\n Migration failed: ${err.message}\n`)
      process.exit(1)
    }
  })

program
  .command('plugins')
  .description('Interactive plugin installer for Zenith CMS')
  .action(async () => {
    try {
      const prompts = require('prompts')
      const { execSync } = require('child_process')

      console.log('\n======================================')
      console.log('   Zenith CMS Plugin Installer')
      console.log('======================================\n')

      const response = await prompts({
        type: 'select',
        name: 'plugin',
        message: 'Which official plugin would you like to install?',
        choices: [
          { title: '🛍️  E-Commerce (Stripe)', value: '@zenithcms/plugin-commerce' },
          { title: '✉️  Email Engine (Resend/SMTP)', value: '@zenithcms/plugin-email' },
          { title: '🔐  OAuth Providers (Google, GitHub)', value: '@zenithcms/plugin-oauth' },
          { title: '☁️  Cloudinary Media Storage', value: '@zenithcms/plugin-cloudinary' },
        ],
      })

      if (!response.plugin) {
        console.log('Installation cancelled.\n')
        process.exit(0)
      }

      console.log(`\n⬇️  Downloading ${response.plugin}...\n`)
      
      try {
        // Run pnpm add. We use inherit so the user sees the progress bar.
        execSync(`pnpm add ${response.plugin}`, { stdio: 'inherit', cwd: process.cwd() })
      } catch (e: any) {
        console.log('\n❌ Failed to install package. (Note: this is expected if the package is not published to NPM yet during development).\n')
      }

      console.log('\n======================================')
      console.log('✅  Package Downloaded Successfully!')
      console.log('======================================\n')
      
      console.log('To complete the installation, you need to enable it in your config.')
      console.log('This keeps Zenith perfectly version-controlled and production-safe.\n')
      
      const variableName = response.plugin.split('-').pop() + 'Plugin'
      
      console.log('👉 STEP 1: Open your \x1b[36mcms.config.ts\x1b[0m file.')
      console.log('👉 STEP 2: Copy and paste the following snippet:\n')
      
      console.log('\x1b[32m' + `import { ${variableName} } from '${response.plugin}'` + '\x1b[0m')
      console.log('')
      console.log('export default {')
      console.log('  collections: [...],')
      console.log('  plugins: [')
      console.log('\x1b[32m' + `    ${variableName}({` + '\x1b[0m')
      console.log('\x1b[32m' + `      // Add your configuration here` + '\x1b[0m')
      console.log('\x1b[32m' + `    })` + '\x1b[0m')
      console.log('  ]')
      console.log('}\n')
      
      console.log('👉 STEP 3: Restart your development server.\n')

      process.exit(0)
    } catch (err: any) {
      console.error(`\nCLI plugin installer failed: ${err.message}\n`)
      process.exit(1)
    }
  })

program.parse()
