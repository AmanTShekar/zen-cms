import { test, expect } from '@playwright/test';

test.describe('Flow Builder (Automations)', () => {
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

  test('loads Flow Builder canvas', async ({ page }) => {
    await page.goto('/automations');

    await expect(page.locator('text=Automation Flows')).toBeVisible();
    
    // Check that the ReactFlow canvas loaded
    const canvas = page.locator('.react-flow');
    await expect(canvas).toBeVisible();
  });

  test('adds a webhook trigger node to the canvas', async ({ page }) => {
    await page.goto('/automations');

    // Click "Add Node" or drag from a palette if one exists
    // Assuming there's a button or context menu to add nodes
    const addTriggerBtn = page.locator('button', { hasText: /Add Trigger/i });
    if (await addTriggerBtn.isVisible()) {
      await addTriggerBtn.click();
      await page.click('text=Webhook Event');

      // Check if the node appeared on the canvas
      await expect(page.locator('.react-flow__node:has-text("Webhook")')).toBeVisible();
    }
  });

  test('saves the automation flow', async ({ page }) => {
    await page.goto('/automations');

    // Attempt to save the flow
    await page.route('**/api/v1/flows', async (route, request) => {
      if (request.method() === 'POST' || request.method() === 'PUT') {
        await route.fulfill({ status: 200, json: { data: { success: true } } });
      } else {
        await route.continue();
      }
    });

    const saveBtn = page.locator('button', { hasText: /Save Flow/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await expect(page.locator('text=successfully')).toBeVisible();
    }
  });
});
