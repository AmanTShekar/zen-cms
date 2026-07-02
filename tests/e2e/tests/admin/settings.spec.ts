import { test, expect } from '@playwright/test';

test.describe('Settings & Danger Zone', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user session via API
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({
        status: 200,
        json: { data: { id: 'admin123', email: 'admin@zenith.com', name: 'Admin', role: 'admin' } }
      });
    });

    // Mock active workspace state in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('activeSiteName', 'Test Site');
      window.localStorage.setItem('activeWorkspaceId', 'ws_1');
    });

    // Mock initial settings fetch
    await page.route('**/api/v1/settings', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            siteName: 'Test Site',
            defaultLocale: 'en',
            maintenanceMode: false
          }
        }
      });
    });

    // Mock workspace fetch for owner check
    await page.route('**/api/v1/workspaces', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            { _id: 'ws_1', name: 'Alpha Workspace', ownerId: 'admin123' }
          ]
        }
      });
    });
  });

  test('loads settings page and updates site name', async ({ page }) => {
    await page.goto('/settings');

    // Wait for the settings page to render
    await expect(page.locator('h1')).toContainText('Settings');
    
    // Check general tab is active
    await expect(page.locator('label:has-text("Site Name")')).toBeVisible();
    
    // Mock successful update
    await page.route('**/api/v1/settings', async (route, request) => {
      if (request.method() === 'PUT') {
        await route.fulfill({ status: 200, json: { data: { success: true } } });
      } else {
        await route.continue();
      }
    });

    // Change site name
    await page.fill('input[placeholder="My Awesome Site"]', 'Updated Site Name');
    await page.click('button:has-text("Save Configuration")');

    // Toast should appear
    await expect(page.locator('text=Settings synced securely')).toBeVisible();
  });

  test('shows and executes Danger Zone tenant deletion', async ({ page }) => {
    await page.goto('/settings');

    // Scroll to bottom where Danger Zone is
    await page.locator('text=Danger Zone').scrollIntoViewIfNeeded();
    await expect(page.locator('h3:has-text("Danger Zone")')).toBeVisible();

    // Click delete workspace
    await page.click('button:has-text("Delete Workspace")');

    // Modal should appear
    await expect(page.locator('text=Confirm Catastrophic Deletion')).toBeVisible();

    // Fill in the confirmation text (Alpha Workspace)
    await page.fill('input[placeholder="Alpha Workspace"]', 'Alpha Workspace');

    // Mock delete request
    await page.route('**/api/v1/workspaces/*', async (route, request) => {
      if (request.method() === 'DELETE') {
        await route.fulfill({ status: 200, json: { data: { success: true } } });
      } else {
        await route.continue();
      }
    });

    // Click the final red button
    const eradicateButton = page.locator('button', { hasText: 'Eradicate Alpha Workspace' });
    await eradicateButton.click();

    // Should redirect to /sites since the workspace was deleted
    await expect(page).toHaveURL(/.*\/sites$/);
  });

  test('navigates between settings tabs', async ({ page }) => {
    await page.goto('/settings');

    // Click Webhooks tab
    await page.click('text=Webhooks');
    await expect(page.locator('h2:has-text("Webhook Endpoints")')).toBeVisible();

    // Click API Keys tab
    await page.click('text=API Keys');
    await expect(page.locator('button:has-text("Generate New Key")')).toBeVisible();
  });
});
