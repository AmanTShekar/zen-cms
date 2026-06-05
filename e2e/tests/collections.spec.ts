import { test, expect } from '@playwright/test';

test.describe('Collection Management', () => {

  // Run before each test in this block
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@zenithcms.local');
    await page.fill('input[name="password"]', 'Admin@1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('Create a new collection', async ({ page }) => {
    await page.goto('/collections');
    
    // Open modal
    await page.getByText('Create Collection').click();
    
    // Fill collection details
    await page.fill('input[name="name"]', 'E2E Test Articles');
    await page.fill('input[name="slug"]', 'e2e-test-articles');
    
    // Fill the first field name
    await page.fill('input[name="field-name-0"]', 'title');
    
    // Save collection
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/system/collections') && res.request().method() === 'POST'),
      page.getByText('Create Content Type').click()
    ]);
    expect(response.status()).toBe(201);
  });

  test('Duplicate slug validation', async ({ page }) => {
    await page.goto('/collections');
    
    // Open modal
    await page.getByText('Create Collection').click();
    
    await page.fill('input[name="name"]', 'Another E2E Test Articles');
    await page.fill('input[name="slug"]', 'e2e-test-articles'); // Intentional duplicate
    await page.fill('input[name="field-name-0"]', 'title');
    
    await page.getByText('Create Content Type').click();
    
    // Verify validation error
    await expect(page.locator('text=already exists').first()).toBeVisible();
  });

});
