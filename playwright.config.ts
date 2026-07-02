import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // 1 retry locally to handle flakiness
  workers: 1, // Run sequentially for easier DB state management
  reporter: 'html',
  timeout: 60000, // 60s per test
  use: {
    baseURL: 'http://localhost:9176',
    trace: 'on-first-retry',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    storageState: 'tests/e2e/storageState.json',
  },
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @zenith-open/zenithcms-core dev',
      port: 9001,
      timeout: 120 * 1000,
      reuseExistingServer: true,
      env: {
        NODE_ENV: 'test',
        PORT: '9001',
        DATABASE_TYPE: process.env.DATABASE_TYPE || 'mongodb',
        MONGODB_URI: 'mongodb://localhost:27017/zenith-e2e',
        POSTGRES_URI: 'postgresql://postgres:postgres@localhost:5432/zenith_e2e',
        JWT_SECRET: 'e2e_secret_must_be_at_least_32_characters_long',
        JWT_REFRESH_SECRET: 'e2e_refresh_must_be_at_least_32_characters_long',
      },
    },
    {
      command: 'pnpm --filter @zenith-open/zenithcms-admin dev',
      port: 9176,
      timeout: 120 * 1000,
      reuseExistingServer: true,
      env: {
        NODE_ENV: 'test',
        VITE_PORT: '9176',
        CORE_PORT: '9001',
      },
    },
  ],
});
