import { test, expect } from '@playwright/test';

test.describe('Visual Graph (Schema Map)', () => {
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

    // Mock schemas to populate the visual graph
    await page.route('**/api/v1/schemas', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            data: [
              { _id: 's1', name: 'Authors', slug: 'authors', fields: [{ name: 'name', type: 'text' }] },
              { _id: 's2', name: 'Posts', slug: 'posts', fields: [{ name: 'author', type: 'relation', relationTo: 'authors' }] }
            ]
          }
        });
      } else {
        await route.continue();
      }
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('activeSiteName', 'Test Site');
      window.localStorage.setItem('activeWorkspaceId', 'ws_1');
      window.localStorage.setItem('activeSiteId', 'site_1');
    });
  });

  test('loads visual graph and displays schema nodes', async ({ page }) => {
    await page.goto('/graph');

    await expect(page.locator('text=Architecture Graph')).toBeVisible();

    // The ForceGraph2D usually renders inside a canvas element
    const canvasElement = page.locator('canvas');
    await expect(canvasElement).toBeVisible();

    // We can also check if the custom UI overlay is showing
    await expect(page.locator('text=Nodes')).toBeVisible();
    await expect(page.locator('text=Edges')).toBeVisible();
  });
});
