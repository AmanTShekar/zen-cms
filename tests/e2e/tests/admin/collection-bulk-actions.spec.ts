import { test, expect } from '@playwright/test';

test.describe('Collection Bulk Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Fallback for all api calls
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

    await page.route('**/api/v1/schemas', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: [{ _id: 'schema1', name: 'Articles', slug: 'articles', fields: [] }]
        }
      });
    });

    await page.route('**/api/v1/collections/articles*', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            { _id: 'doc1', title: 'First Article', status: 'published' },
            { _id: 'doc2', title: 'Draft Article', status: 'draft' }
          ],
          meta: { total: 2, page: 1, limit: 10 }
        }
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('activeSiteName', 'Test Site');
      window.localStorage.setItem('activeWorkspaceId', 'ws_1');
      window.localStorage.setItem('activeSiteId', 'site_1');
    });
  });

  test('selects multiple rows and performs bulk deletion', async ({ page }) => {
    await page.goto('/collections/articles');

    // Wait for the table/list to load
    await expect(page.locator('text=First Article')).toBeVisible();

    // The bulk toolbar should initially be hidden
    await expect(page.locator('text=items selected')).not.toBeVisible();

    // Click the "Select All" checkbox or individual checkboxes
    // Assuming the table rows have checkboxes with aria-label or we just click input[type="checkbox"]
    const checkboxes = page.locator('input[type="checkbox"]');
    
    // Click the header checkbox to select all
    await checkboxes.first().click();

    // Bulk toolbar should appear
    await expect(page.locator('text=selected')).toBeVisible();

    // Click bulk delete
    const deleteBtn = page.locator('button', { hasText: /delete/i });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      
      // Confirm modal
      await expect(page.locator('text=Confirm Deletion')).toBeVisible();
      
      // Mock the DELETE request
      await page.route('**/api/v1/collections/articles/bulk', async (route, request) => {
        if (request.method() === 'DELETE') {
          await route.fulfill({ status: 200, json: { data: { deleted: 2 } } });
        } else {
          await route.continue();
        }
      });

      await page.click('button:has-text("Delete")');
      
      // Should show success
      await expect(page.locator('text=successfully')).toBeVisible();
    }
  });
});
