import { test, expect } from '@playwright/test';

test.describe('Component Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ status: 200, json: { data: [] } });
      } else {
        await route.fulfill({ status: 200, json: { data: { success: true } } });
      }
    });

    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({ status: 200, json: { data: { id: 'admin123', email: 'admin@zenith.com', role: 'admin' } } });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('activeSiteName', 'Test Site');
      window.localStorage.setItem('activeWorkspaceId', 'ws_1');
      window.localStorage.setItem('activeSiteId', 'site_1');
    });
  });

  test('loads component builder workspace', async ({ page }) => {
    await page.goto('/component-builder');

    // Wait for the builder UI to load
    await expect(page.locator('h1:has-text("Component Builder")').or(page.locator('text=Builder Studio'))).toBeVisible();
    
    // Check if the canvas area is present
    await expect(page.locator('.builder-canvas, .flex-1.bg-app')).toBeVisible();
  });
});
