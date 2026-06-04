import { test, expect } from '@playwright/test';

test.describe('Role Based Access Control', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@zenithcms.local');
    await page.fill('input[name="password"]', 'Admin@1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('Create a custom role', async ({ page }) => {
    await page.goto('/settings');
    
    // Might be in a roles tab or sub-page
    const rolesLink = page.locator('a[href*="/roles"], button:has-text("Roles")');
    if (await rolesLink.isVisible()) {
      await rolesLink.click();
    } else {
      await page.goto('/settings/roles');
    }
    
    const newRoleBtn = page.locator('button:has-text("Create Role"), a:has-text("Create Role")');
    if (await newRoleBtn.isVisible()) {
      await newRoleBtn.click();
      await page.fill('input[name="name"], input[placeholder="Role Name"]', 'E2E Author');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      await expect(page.locator('text=success').first()).toBeVisible({ timeout: 10000 });
    }
  });

});
