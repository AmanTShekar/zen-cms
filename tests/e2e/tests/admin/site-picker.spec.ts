import { test, expect } from '@playwright/test';

test.describe('Site Picker & Workspace Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user session via API
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({
        status: 200,
        json: { data: { id: 'admin123', email: 'admin@zenith.com', name: 'Admin', role: 'admin' } }
      });
    });

    // Mock workspaces
    await page.route('**/api/v1/workspaces', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            { _id: 'ws_1', name: 'Alpha Workspace', slug: 'alpha', ownerId: 'admin123' },
            { _id: 'ws_2', name: 'Beta Team', slug: 'beta', ownerId: 'other456' }
          ]
        }
      });
    });

    // Mock sites
    await page.route('**/api/v1/sites', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            { _id: 'site_1', name: 'Alpha Blog', slug: 'alpha-blog', workspaceId: 'ws_1' },
            { _id: 'site_2', name: 'Beta Store', slug: 'beta-store', workspaceId: 'ws_2' }
          ]
        }
      });
    });
  });

  test('renders workspaces and sites correctly', async ({ page }) => {
    await page.goto('/sites');

    // Should see both workspaces in the sidebar
    await expect(page.locator('text=Alpha Workspace')).toBeVisible();
    await expect(page.locator('text=Beta Team')).toBeVisible();

    // Since ws_1 is active by default (first in list), Alpha Blog should be visible
    await expect(page.locator('text=Alpha Blog')).toBeVisible();
    await expect(page.locator('text=Beta Store')).not.toBeVisible();

    // Click Beta Team workspace
    await page.click('text=Beta Team');

    // Should now see Beta Store
    await expect(page.locator('text=Beta Store')).toBeVisible();
  });

  test('opens New Workspace modal and submits', async ({ page }) => {
    await page.goto('/sites');

    await page.click('button:has-text("New Workspace")');

    await expect(page.locator('h2:has-text("New Workspace")')).toBeVisible();

    await page.fill('input[placeholder="e.g. Zenith Studio"]', 'Gamma Squad');
    
    // Check auto-slug generation
    await expect(page.locator('input[placeholder="e.g. zenith-studio"]')).toHaveValue('gamma-squad');

    // Mock the POST request
    await page.route('**/api/v1/workspaces', async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 200,
          json: { data: { _id: 'ws_3', name: 'Gamma Squad', slug: 'gamma-squad', ownerId: 'admin123' } }
        });
      } else {
        await route.continue();
      }
    });

    await page.click('button[type="submit"]:has-text("Create")');

    // Modal should close and success toast should appear
    await expect(page.locator('text=Workspace created successfully!')).toBeVisible();
  });

  test('shows Delete Workspace button only for owner', async ({ page }) => {
    await page.goto('/sites');

    // Active workspace is ws_1 (owner is admin123). Button should be visible.
    await expect(page.locator('button:has-text("Delete Workspace")')).toBeVisible();

    // Switch to ws_2 (owner is other456). Button should disappear.
    await page.click('text=Beta Team');
    await expect(page.locator('button:has-text("Delete Workspace")')).not.toBeVisible();
  });
});
