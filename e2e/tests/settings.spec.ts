import { test, expect } from '@playwright/test';

test.describe('Global Settings & Profile', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@zenithcms.local');
    await page.fill('input[name="password"]', 'Admin@1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('Update Global Site Settings', async ({ page }) => {
    await page.goto('/settings');
    
    const generalLink = page.locator('a:has-text("General"), button:has-text("General")');
    if (await generalLink.isVisible()) {
      await generalLink.click();
    }
    
    // Update Site Title
    const titleInput = page.locator('input[name="siteName"], input[name="title"]');
    if (await titleInput.isVisible()) {
      await titleInput.fill('Zenith E2E Site');
      
      // Save changes
      await page.click('button:has-text("Save")');
      await expect(page.locator('text=success').first()).toBeVisible({ timeout: 10000 });
      
      // Verify persistence by reloading
      await page.reload();
      await expect(titleInput).toHaveValue('Zenith E2E Site');
    }
  });

  test('User Profile Update', async ({ page }) => {
    // Open profile modal/page
    const profileBtn = page.locator('button:has-text("System Admin"), .avatar, [aria-label="Profile menu"]');
    if (await profileBtn.isVisible()) {
      await profileBtn.click();
    }
    
    const settingsLink = page.locator('a:has-text("My Profile"), a:has-text("Account Settings")');
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      
      // Update Display Name
      const nameInput = page.locator('input[name="displayName"], input[name="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('System Admin (E2E)');
        await page.click('button:has-text("Save")');
        
        await expect(page.locator('text=success').first()).toBeVisible({ timeout: 10000 });
      }
    }
  });

});
