import { test, expect } from '@playwright/test';

test.describe('Media Library & Uploads', () => {
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

    await page.route('**/api/v1/uploads', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            data: [
              { _id: 'media1', filename: 'hero-image.jpg', url: 'https://example.com/hero.jpg', mimeType: 'image/jpeg' },
              { _id: 'media2', filename: 'document.pdf', url: 'https://example.com/doc.pdf', mimeType: 'application/pdf' }
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

  test('loads media library and displays assets', async ({ page }) => {
    await page.goto('/media');

    await expect(page.locator('h1')).toContainText('Media Asset Pipeline');

    // Wait for the grid to render
    await expect(page.locator('text=hero-image.jpg')).toBeVisible();
    await expect(page.locator('text=document.pdf')).toBeVisible();
    
    // Check search functionality
    await page.fill('input[placeholder*="Search" i]', 'hero');
    
    // Check filter interactions (e.g. Image filter)
    await page.click('button:has-text("Images")');
  });

  test('simulates file upload', async ({ page }) => {
    await page.goto('/media');

    // Set up mock file chooser
    await page.route('**/api/v1/uploads', async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({ 
          status: 200, 
          json: { 
            data: { _id: 'newmedia', filename: 'test-upload.png', url: 'https://example.com/test.png' }
          } 
        });
      } else {
        await route.continue();
      }
    });

    // Handle the file chooser event triggered by clicking upload button
    page.on('filechooser', async (fileChooser) => {
      // Mock an in-memory file for upload
      await fileChooser.setFiles({
        name: 'test-upload.png',
        mimeType: 'image/png',
        buffer: Buffer.from('mock image data')
      });
    });

    const uploadBtn = page.locator('button', { hasText: /Upload/i });
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
    }
  });
});
