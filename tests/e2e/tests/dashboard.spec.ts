import { test, expect } from '@playwright/test'

test.describe('Dashboard & Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@zenithcms.local')
    await page.fill('input[name="password"]', 'Admin@1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/')
  })

  test('Dashboard loads all critical widgets', async ({ page }) => {
    // Navigate to root dashboard
    await page.goto('/')

    try {
      await expect(page.getByText('Team Members')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Content Assets')).toBeVisible()
      await expect(page.getByText('System Uptime')).toBeVisible()
    } catch (e) {
      await page.screenshot({ path: 'test-results/dashboard-failed.png', fullPage: true })
      throw e
    }
  })
})
