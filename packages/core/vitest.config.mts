import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@zenith-open/zenithcms-types': path.resolve(__dirname, '../types/src/index.ts'),
      '@zenith-open/zenithcms-db-postgres': path.resolve(__dirname, '../db-postgres/src/index.ts'),
      '@zenith-open/zenithcms-db-mongodb': path.resolve(__dirname, '../db-mongodb/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 9,
        functions: 30,
        branches: 48,
        statements: 9,
      },
    },
  },
})
