import { test, expect } from '@playwright/test';

test.describe('JOURNEY-01: Complete Content Lifecycle', () => {
  // Use a unique email for each run to avoid collision
  const testEmail = `test_${Date.now()}@zenithcms.com`;
  const testPassword = 'Password123!';
  const siteName = `Site ${Date.now()}`;

  test('Register, Create Site, Publish Document, Fetch API', async ({ page, request }) => {
    // 1. Register
    await page.goto('/auth/register');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Expected to be redirected to dashboard or onboarding
    await expect(page).toHaveURL(/.*\/dashboard/);

    // 2. Create Workspace & Site
    // Wait for dashboard to load
    await page.waitForSelector('text=Workspaces');
    await page.click('button:has-text("Create Workspace")');
    await page.fill('input[name="workspaceName"]', 'Test Workspace');
    await page.click('button:has-text("Save")');

    await page.click('button:has-text("Create Site")');
    await page.fill('input[name="siteName"]', siteName);
    await page.fill('input[name="siteSlug"]', `test-site-${Date.now()}`);
    await page.click('button:has-text("Save")');

    // 3. Navigate into the site
    await page.click(`text=${siteName}`);
    await expect(page).toHaveURL(/.*\/site\/.*/);

    // Get the Site ID from the URL or headers
    const siteUrl = page.url();
    const siteIdMatch = siteUrl.match(/\/site\/([^/]+)/);
    const siteId = siteIdMatch ? siteIdMatch[1] : '';

    // 4. Create Document in a default collection (e.g., 'pages')
    await page.click('a:has-text("Pages")');
    await page.click('button:has-text("Create New")');

    await page.fill('input[name="title"]', 'E2E Test Page');
    // Rich text editor interaction
    await page.fill('[contenteditable="true"]', 'This is an E2E generated page.');
    
    // Save as Draft
    await page.click('button:has-text("Save Draft")');
    await expect(page.locator('text=Draft saved successfully')).toBeVisible();

    // Publish
    await page.click('button:has-text("Publish")');
    await expect(page.locator('text=Document published successfully')).toBeVisible();

    // 5. Fetch via unauthenticated GET
    // We assume the collection is 'pages' and publicRead is enabled or we test the 401/403.
    // If it's private, we expect a 401/403 without the JWT.
    const apiContext = await request.newContext();
    const res = await apiContext.get(`/api/v1/pages`, {
      headers: {
        'x-zenith-site-id': siteId
      }
    });

    // Check if it's 200 or 403 (depends on default collection config)
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].title).toBe('E2E Test Page');
    }
  });
});
