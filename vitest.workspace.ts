import { defineWorkspace } from 'vitest/config'
import path from 'path'

export default defineWorkspace([
  {
    test: {
      name: 'core',
      include: ['tests/unit/core/**/*.test.ts'],
      environment: 'node',
      pool: 'forks',
      fileParallelism: false,
      setupFiles: ['./packages/core/vitest.setup.ts'],
      globals: true,
      alias: {
        '@zenith-open/zenithcms-types': path.resolve(__dirname, 'packages/types/src/index.ts'),
        '@zenith-open/zenithcms-db-postgres': path.resolve(__dirname, 'packages/db-postgres/src/index.ts'),
        '@zenith-open/zenithcms-db-mongodb': path.resolve(__dirname, 'packages/db-mongodb/src/index.ts'),
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['**/node_modules/**', '**/dist/**', 'tests/**', '**/*.test.ts'],
        thresholds: {
          lines: 60,
          functions: 60,
          branches: 60,
          statements: 60
        }
      }
    }
  },
  {
    test: {
      name: 'admin',
      include: ['tests/unit/admin/**/*.test.ts'],
      environment: 'node',
      globals: true,
      setupFiles: ['./tests/unit/admin/setup.ts'],
      env: {
        VITE_API_URL: 'http://localhost:5173/api/v1',
      }
    }
  },
  {
    test: {
      name: 'sdk',
      include: ['tests/unit/sdk/**/*.test.ts'],
      environment: 'node',
      globals: true,
    }
  }
])
