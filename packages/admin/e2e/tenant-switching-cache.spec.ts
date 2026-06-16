import { test, expect } from '@playwright/test';

test.describe('JOURNEY-04: Tenant Switching Cache', () => {
  const testEmail = `switch_${Date.now()}@zenithcms.com`;

  test('React state should not bleed across tenant switches', async ({ page }) => {
    // 1. Setup User
    await page.goto('/auth/register');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 2. Create Site A
    await page.waitForSelector('text=Workspaces');
    await page.click('button:has-text("Create Site")');
    await page.fill('input[name="siteName"]', 'Site A');
    await page.fill('input[name="siteSlug"]', `site-a-${Date.now()}`);
    await page.click('button:has-text("Save")');

    // 3. Create Site B
    await page.goto('/dashboard');
    await page.click('button:has-text("Create Site")');
    await page.fill('input[name="siteName"]', 'Site B');
    await page.fill('input[name="siteSlug"]', `site-b-${Date.now()}`);
    await page.click('button:has-text("Save")');

    // 4. Enter Site A and create document
    await page.goto('/dashboard');
    await page.click('text=Site A');
    await page.click('a:has-text("Pages")');
    await page.click('button:has-text("Create New")');
    await page.fill('input[name="title"]', 'Site A Unique Document');
    await page.click('button:has-text("Publish")');
    await expect(page.locator('text=Document published')).toBeVisible();

    // 5. Enter Site B and create document
    await page.goto('/dashboard');
    await page.click('text=Site B');
    await page.click('a:has-text("Pages")');
    await page.click('button:has-text("Create New")');
    await page.fill('input[name="title"]', 'Site B Unique Document');
    await page.click('button:has-text("Publish")');
    await expect(page.locator('text=Document published')).toBeVisible();

    // 6. Switch back and forth rapidly
    // Check Site A
    await page.goto('/dashboard');
    await page.click('text=Site A');
    await page.click('a:has-text("Pages")');
    
    // Site A doc should be visible
    await expect(page.locator('text=Site A Unique Document')).toBeVisible();
    // Site B doc should NOT be visible
    await expect(page.locator('text=Site B Unique Document')).not.toBeVisible();

    // Check Site B
    await page.goto('/dashboard');
    await page.click('text=Site B');
    await page.click('a:has-text("Pages")');
    
    // Site B doc should be visible
    await expect(page.locator('text=Site B Unique Document')).toBeVisible();
    // Site A doc should NOT be visible
    await expect(page.locator('text=Site A Unique Document')).not.toBeVisible();
  });
});
