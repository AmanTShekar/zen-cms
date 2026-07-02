import { test, expect } from '@playwright/test';

test.describe('Collections List & Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Fallback for all api calls to prevent 401 redirects to login
    await page.route('**/api/v1/**', async (route, request) => {
      // We will override specific routes below.
      // For any unhandled route, just return a generic 200 to keep the app alive
      if (request.method() === 'GET') {
        await route.fulfill({ status: 200, json: { data: [] } });
      } else {
        await route.fulfill({ status: 200, json: { data: { success: true } } });
      }
    });

    // Mock auth
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({ status: 200, json: { data: { id: 'admin123', email: 'admin@zenith.com', role: 'admin' } } });
    });

    // Mock schema definitions
    await page.route('**/api/v1/schemas', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            { _id: 'schema1', name: 'Articles', slug: 'articles', fields: [] },
            { _id: 'schema2', name: 'Authors', slug: 'authors', fields: [] }
          ]
        }
      });
    });

    // Mock documents for 'articles'
    await page.route('**/api/v1/collections/articles*', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            { _id: 'doc1', title: 'First Article', status: 'published', createdAt: new Date().toISOString() },
            { _id: 'doc2', title: 'Draft Article', status: 'draft', createdAt: new Date().toISOString() }
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

  test('loads collections overview page and lists schemas', async ({ page }) => {
    await page.goto('/collections');

    await expect(page.locator('h1')).toContainText('Collections');
    
    // Should render the schema cards
    await expect(page.locator('text=Articles')).toBeVisible();
    await expect(page.locator('text=Authors')).toBeVisible();

    // Navigate to articles
    await page.click('text=Articles');
    await expect(page).toHaveURL(/.*\/collections\/articles$/);
  });

  test('renders collection documents with pagination', async ({ page }) => {
    await page.goto('/collections/articles');

    await expect(page.locator('h1')).toContainText('Articles');
    
    // Check documents are rendered in the table/list
    await expect(page.locator('text=First Article')).toBeVisible();
    await expect(page.locator('text=Draft Article')).toBeVisible();
    
    // Check status badges
    await expect(page.locator('text=published')).toBeVisible();
    await expect(page.locator('text=draft')).toBeVisible();
  });

  test('clicks create new document button', async ({ page }) => {
    await page.goto('/collections/articles');

    // Click "Create" button
    await page.click('button:has-text("Create")');

    // Should navigate to spatial editor for new document
    await expect(page).toHaveURL(/.*\/collections\/articles\/new$/);
  });
});
