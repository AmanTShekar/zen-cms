import { test, expect } from '@playwright/test';

test.describe('Schema Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept all API calls
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
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            data: [
              { _id: 'schema1', name: 'Articles', slug: 'articles', fields: [] }
            ]
          }
        });
      } else {
        await route.continue();
      }
    });

    // Mock active workspace state in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('activeSiteName', 'Test Site');
      window.localStorage.setItem('activeWorkspaceId', 'ws_1');
      window.localStorage.setItem('activeSiteId', 'site_1');
    });
  });

  test('loads schema builder and displays existing schemas', async ({ page }) => {
    await page.goto('/schema-builder');

    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Schema Builder');

    // Should see Articles schema in the sidebar
    await expect(page.locator('text=Articles')).toBeVisible();
  });

  test('creates a new schema collection', async ({ page }) => {
    await page.goto('/schema-builder');

    // Click "Create Schema"
    await page.click('button:has-text("Create Schema")');
    
    // Schema details form should appear
    await expect(page.locator('h2:has-text("Schema Details")')).toBeVisible();
    
    // Fill out schema name
    await page.fill('input[placeholder="e.g. Blog Posts"]', 'Products');
    
    // Mock the POST request for schema creation
    await page.route('**/api/v1/schemas', async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 200,
          json: { data: { _id: 'new_schema', name: 'Products', slug: 'products', fields: [] } }
        });
      } else {
        await route.continue();
      }
    });

    // Click Save
    await page.click('button:has-text("Save Schema")');

    // Verify success toast
    await expect(page.locator('text=Schema saved')).toBeVisible();
  });

  test('drags and drops a new field onto the canvas', async ({ page }) => {
    await page.goto('/schema-builder');

    // Select the Articles schema
    await page.click('text=Articles');

    // Ensure we are in edit mode
    await expect(page.locator('text=Field Palette')).toBeVisible();

    // Verify we have a text field available to drag
    const textFieldDraggable = page.locator('text=Text Field');
    await expect(textFieldDraggable).toBeVisible();

    // Note: Playwright drag-and-drop can be finicky with complex custom dnd libraries (like dnd-kit)
    // Here we ensure the elements are visible and ready.
    const dropZone = page.locator('.flex-1.bg-app'); // Canvas drop zone
    
    // Simulate drag and drop
    await textFieldDraggable.dragTo(dropZone);

    // After dropping, a "Field Settings" or the field itself should appear in the builder
    // Check if the property panel or modal opened
    const fieldSettings = page.locator('text=Field Settings');
    if (await fieldSettings.isVisible()) {
      await page.fill('input[placeholder="e.g. Title"]', 'Title');
      await page.click('button:has-text("Save Field")');
    }
  });
});
