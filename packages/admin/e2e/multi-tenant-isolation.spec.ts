import { test, expect } from '@playwright/test';

test.describe('JOURNEY-03: Multi-Tenant Isolation', () => {
  const tenantA_Email = `tenantA_${Date.now()}@zenithcms.com`;
  const tenantB_Email = `tenantB_${Date.now()}@zenithcms.com`;

  let tenantA_SiteId = '';

  test('Tenant B cannot access Tenant A documents', async ({ browser }) => {
    // 1. Setup Tenant A
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    
    await pageA.goto('/auth/register');
    await pageA.fill('input[type="email"]', tenantA_Email);
    await pageA.fill('input[type="password"]', 'Password123!');
    await pageA.click('button[type="submit"]');
    
    await pageA.waitForSelector('text=Workspaces');
    await pageA.click('button:has-text("Create Site")');
    await pageA.fill('input[name="siteName"]', 'Tenant A Site');
    await pageA.fill('input[name="siteSlug"]', `site-a-${Date.now()}`);
    await pageA.click('button:has-text("Save")');
    
    await pageA.click('text=Tenant A Site');
    await expect(pageA).toHaveURL(/.*\/site\/.*/);
    
    const urlA = pageA.url();
    const matchA = urlA.match(/\/site\/([^/]+)/);
    tenantA_SiteId = matchA ? matchA[1] : '';
    expect(tenantA_SiteId).not.toBe('');

    // Create 5 documents
    await pageA.click('a:has-text("Pages")');
    for(let i=1; i<=5; i++) {
      await pageA.click('button:has-text("Create New")');
      await pageA.fill('input[name="title"]', `Tenant A Doc ${i}`);
      await pageA.click('button:has-text("Publish")');
      await expect(pageA.locator('text=Document published')).toBeVisible();
      // Go back to list
      await pageA.click('a:has-text("Pages")');
    }

    // 2. Setup Tenant B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await pageB.goto('/auth/register');
    await pageB.fill('input[type="email"]', tenantB_Email);
    await pageB.fill('input[type="password"]', 'Password123!');
    await pageB.click('button[type="submit"]');

    // 3. Attempt Access via API proxy in browser context
    // This executes JS in the browser of Tenant B (authenticated as Tenant B)
    // trying to fetch Tenant A's site.
    const result = await pageB.evaluate(async (siteId) => {
      try {
        const res = await fetch(`/api/v1/pages`, {
          headers: {
            'x-zenith-site-id': siteId
          }
        });
        if (res.status === 403 || res.status === 401) {
          return { blocked: true, status: res.status };
        }
        const data = await res.json();
        return { blocked: false, data: data.data };
      } catch (e) {
        return { blocked: true, error: (e as Error).message };
      }
    }, tenantA_SiteId);

    // It MUST be blocked
    expect(result.blocked).toBe(true);
    expect([401, 403]).toContain(result.status);

    await contextA.close();
    await contextB.close();
  });
});
