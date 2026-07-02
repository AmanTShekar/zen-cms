import { test, expect } from '@playwright/test';

test.describe('AI Architect / Writer', () => {
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

  test('loads AI Architect and submits prompt', async ({ page }) => {
    await page.goto('/ai-architect');

    // Wait for the AI page to load
    await expect(page.locator('h1')).toContainText('AI Architect');
    
    // Fill the prompt textarea
    const promptInput = page.locator('textarea[placeholder*="Describe" i]');
    if (await promptInput.isVisible()) {
      await promptInput.fill('Generate a schema for a tech blog');
      
      // Mock the AI response stream or standard response
      await page.route('**/api/v1/ai/generate', async (route) => {
        await route.fulfill({ 
          status: 200, 
          json: { data: { result: 'Here is your schema definition...' } } 
        });
      });

      // Click Generate
      await page.click('button:has-text("Generate")');

      // Expect response to appear in the UI
      await expect(page.locator('text=Here is your schema definition...')).toBeVisible();
    }
  });
});
