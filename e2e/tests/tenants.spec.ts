import { test, expect } from '@playwright/test';

test.describe('Multi-Tenancy (Workspaces/Sites)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@zenithcms.local');
    await page.fill('input[name="password"]', 'Admin@1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('Create workspace/site and verify context', async ({ page }) => {
    // There is usually a workspace/site switcher in the header
    await page.goto('/sites');
    
    const newSiteBtn = page.locator('button:has-text("New Site"), a:has-text("New Site")');
    if (await newSiteBtn.isVisible()) {
      await newSiteBtn.click();
      await page.fill('input[name="name"], input[placeholder="Site Name"]', 'E2E Tenant Site');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      
      await expect(page.locator('text=success').first()).toBeVisible({ timeout: 10000 });
      
      // Select the new site
      await page.click('text=E2E Tenant Site');
      
      // Verify dashboard context changed
      // Note: checking for specific header text depending on UI
      await expect(page.locator('text=E2E Tenant Site').first()).toBeVisible();
    }
  });

});
