#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import { ZenithEngine } from '../index';
import { SchemaSync } from '../database/sync';
import { logger } from '../services/logger';

const program = new Command();

program
  .name('zenith')
  .description('Zenith CMS Management CLI')
  .version('1.0.0');

program
  .command('sync')
  .description('Sync cms.config.ts schema with the database')
  .option('-c, --config <path>', 'Path to cms.config.ts', 'cms.config.ts')
  .action(async (options) => {
    try {
      const configPath = path.resolve(process.cwd(), options.config);
      const { default: config } = await import(configPath);
      
      const engine = new ZenithEngine({ config });
      await engine.adapter.connect();
      
      const syncer = new SchemaSync(config, engine.adapter);
      const stats = await syncer.sync();
      
      console.log(`\n✅ Sync complete! Created/Updated ${stats.updated} collections.\n`);
      process.exit(0);
    } catch (err: any) {
      logger.error({ err: err.message }, 'CLI Sync failed');
      process.exit(1);
    }
  });

program.parse();
