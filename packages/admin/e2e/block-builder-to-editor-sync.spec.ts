import { test, expect } from '@playwright/test';

test.describe('JOURNEY-02: Block Builder to Editor Sync', () => {
  const testEmail = `admin_${Date.now()}@zenithcms.com`;

  test.beforeEach(async ({ page }) => {
    // Quick login helper
    await page.goto('/auth/register');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('Create block in BlockBuilder and use it in SpatialEditor', async ({ page }) => {
    // 1. Open BlockBuilder
    await page.click('text=Block Builder');
    
    // 2. Create block with 4 field types
    await page.click('button:has-text("New Block")');
    const blockName = `Hero Block ${Date.now()}`;
    await page.fill('input[name="blockName"]', blockName);
    
    // Add fields
    await page.click('button:has-text("Add Field")');
    await page.selectOption('select[name="fieldType"]', 'text');
    await page.fill('input[name="fieldName"]', 'heading');
    
    await page.click('button:has-text("Add Field")');
    await page.selectOption('select[name="fieldType"]', 'richtext');
    await page.fill('input[name="fieldName"]', 'description');

    await page.click('button:has-text("Add Field")');
    await page.selectOption('select[name="fieldType"]', 'media');
    await page.fill('input[name="fieldName"]', 'background_image');

    await page.click('button:has-text("Add Field")');
    await page.selectOption('select[name="fieldType"]', 'boolean');
    await page.fill('input[name="fieldName"]', 'dark_mode');

    // Save block
    await page.click('button:has-text("Save Block")');
    await expect(page.locator('text=Block saved successfully')).toBeVisible();

    // 3. Open SpatialEditor / Pages
    await page.click('a:has-text("Pages")');
    await page.click('button:has-text("Create New")');
    
    // 4. BlockPicker Modal
    await page.click('button:has-text("Add Section")');
    
    // 5. Assert new block appears
    const blockLocator = page.locator(`text=${blockName}`);
    await expect(blockLocator).toBeVisible();

    // 6. Add block and fill fields
    await blockLocator.click();
    await page.fill('input[name="heading"]', 'My Awesome Hero');
    // ... fill other fields if UI provides them immediately
    
    // 7. Save document
    await page.fill('input[name="title"]', 'Home Page Test');
    await page.click('button:has-text("Save Draft")');
    await expect(page.locator('text=Draft saved successfully')).toBeVisible();
  });
});
