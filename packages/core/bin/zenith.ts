#!/usr/bin/env tsx
import { Command } from 'commander';
import { ZenithEngine } from '../src/index';
import { _logger } from '../src/services/logger';

const program = new Command();

program
  .name('zenith')
  .description('Zenith CMS Command Line Interface')
  .version('1.0.0');

program
  .command('start')
  .description('Start the Zenith CMS Engine')
  .option('-p, --port <number>', 'Port to run on', '3000')
  .action(async (options) => {
    // In a real CLI, we would load the zenith.config.ts here
    const config = { collections: [] }; 
    const engine = new ZenithEngine(config as unknown);
    await engine.start(parseInt(options.port));
  });

program
  .command('export-schema')
  .description('Export the current CMS schema to a JSON file')
  .action(async () => {
    const config = { collections: [] };
    const engine = new ZenithEngine(config as unknown);
    await engine.exportSchema();
  });

program.parse();
