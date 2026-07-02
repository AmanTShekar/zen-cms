import { test, expect } from '@playwright/test';

test.describe('Audit Log', () => {
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

    // Mock audit logs
    await page.route('**/api/v1/audit*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            data: [
              { _id: 'log1', action: 'CREATE', targetType: 'document', userId: 'admin123', createdAt: new Date().toISOString() },
              { _id: 'log2', action: 'DELETE', targetType: 'schema', userId: 'admin123', createdAt: new Date().toISOString() }
            ],
            meta: { total: 2, page: 1, limit: 50 }
          }
        });
      }
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('activeSiteName', 'Test Site');
      window.localStorage.setItem('activeWorkspaceId', 'ws_1');
      window.localStorage.setItem('activeSiteId', 'site_1');
    });
  });

  test('loads audit log table and verifies entries', async ({ page }) => {
    await page.goto('/audit-log');

    await expect(page.locator('h1')).toContainText('Audit Trail');

    // Should show mocked log entries
    await expect(page.locator('text=CREATE')).toBeVisible();
    await expect(page.locator('text=DELETE')).toBeVisible();
    await expect(page.locator('text=document')).toBeVisible();
  });
});
