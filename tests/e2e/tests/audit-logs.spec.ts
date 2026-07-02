import { test, expect } from '@playwright/test'

test.describe('Audit Logs & Tracing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@zenithcms.local')
    await page.fill('input[name="password"]', 'Admin@1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/')
  })

  test('Actions are recorded in the audit log', async ({ page }) => {
    // 1. Perform an action (create a dummy collection)
    await page.goto('/collections')

    // Open modal
    await page.getByText('Create Collection').click()

    const uniqueSuffix = Date.now().toString()

    // Fill collection details
    await page.fill('input[name="name"]', `Audit Target ${uniqueSuffix}`)
    await page.fill('input[name="slug"]', `audit-target-${uniqueSuffix}`)
    await page.fill('input[name="field-name-0"]', 'title')

    // Save collection
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/system/collections') && res.request().method() === 'POST'
      ),
      page.getByText('Create Content Type').click(),
    ])

    expect(response.status()).toBe(201)

    // 2. Go to audit logs
    await page.goto('/audit-log')

    // 3. Verify the action appears in the logs
    // Looking for a table row that contains "SYSTEM" and "CREATE"
    try {
      const logTable = page.locator('table')
      await expect(logTable).toBeVisible({ timeout: 10000 })
      await expect(logTable.locator('text=SYSTEM').first()).toBeVisible()
      await expect(logTable.locator('text=CREATE').first()).toBeVisible()
    } catch (e) {
      await page.screenshot({ path: 'test-results/audit-logs-failed.png', fullPage: true })
      throw e
    }
  })
})
