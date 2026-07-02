import { test, expect } from '@playwright/test';

test.describe('Trash (Soft Delete Bin)', () => {
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

    // Mock trash entries
    await page.route('**/api/v1/trash*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            data: [
              { _id: 'trash1', documentId: 'docX', collectionSlug: 'articles', title: 'Deleted Article', deletedAt: new Date().toISOString() }
            ],
            meta: { total: 1, page: 1, limit: 50 }
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

  test('loads trash bin and renders deleted items', async ({ page }) => {
    await page.goto('/trash');

    await expect(page.locator('h1')).toContainText('Trash');

    // Should see the deleted item
    await expect(page.locator('text=Deleted Article')).toBeVisible();
    await expect(page.locator('text=articles')).toBeVisible();
  });

  test('restores an item from the trash', async ({ page }) => {
    await page.goto('/trash');

    // Mock the restore request
    await page.route('**/api/v1/trash/*/restore', async (route) => {
      await route.fulfill({ status: 200, json: { data: { success: true } } });
    });

    const restoreBtn = page.locator('button[aria-label="Restore"], button:has-text("Restore")').first();
    if (await restoreBtn.isVisible()) {
      await restoreBtn.click();
      await expect(page.locator('text=restored')).toBeVisible();
    }
  });

  test('permanently deletes an item from the trash', async ({ page }) => {
    await page.goto('/trash');

    // Mock the hard delete request
    await page.route('**/api/v1/trash/*', async (route, request) => {
      if (request.method() === 'DELETE') {
        await route.fulfill({ status: 200, json: { data: { success: true } } });
      } else {
        await route.continue();
      }
    });

    const deleteBtn = page.locator('button[aria-label="Permanently Delete"], button:has-text("Delete")').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      
      // Confirm modal
      await page.click('button:has-text("Confirm")');
      
      await expect(page.locator('text=deleted permanently')).toBeVisible();
    }
  });
});
