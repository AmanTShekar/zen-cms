import { test, expect } from '@playwright/test';

test.describe('Spatial Editor', () => {
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

    await page.route('**/api/v1/schemas', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: [{ _id: 'schema1', name: 'Articles', slug: 'articles', fields: [
            { name: 'title', type: 'text' },
            { name: 'content', type: 'richtext' }
          ] }]
        }
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('activeSiteName', 'Test Site');
      window.localStorage.setItem('activeWorkspaceId', 'ws_1');
      window.localStorage.setItem('activeSiteId', 'site_1');
    });
  });

  test('loads Spatial Editor and allows typing', async ({ page }) => {
    // Navigate to create new document
    await page.goto('/collections/articles/new');

    // Check Editor renders
    await expect(page.locator('text=Draft')).toBeVisible();

    // Fill Title if it exists
    const titleInput = page.locator('input[placeholder*="Title" i]');
    if (await titleInput.isVisible()) {
      await titleInput.fill('My New E2E Article');
    }

    // Lexical contenteditable area
    const editor = page.locator('[contenteditable="true"]');
    await expect(editor).toBeVisible();
    
    // Type into the editor
    await editor.click();
    await page.keyboard.type('Hello from Playwright E2E test! ');

    // Highlight text and apply bold
    await page.keyboard.press('Control+B');
    await page.keyboard.type('This is bold text.');
    
    // Test slash menu
    await page.keyboard.type(' /');
    
    // Menu should appear
    const slashMenu = page.locator('.slash-menu-popup');
    if (await slashMenu.isVisible()) {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }

    // Save document
    await page.route('**/api/v1/collections/articles', async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({ status: 200, json: { data: { _id: 'newdoc', title: 'My New E2E Article' } } });
      } else {
        await route.continue();
      }
    });

    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Document Saved')).toBeVisible();
  });
});
