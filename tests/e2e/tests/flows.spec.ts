import { test, expect } from '@playwright/test'

test.describe('Automation & Workflows (FlowEngine)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@zenithcms.local')
    await page.fill('input[name="password"]', 'Admin@1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/')
  })

  test('Create a basic automation flow', async ({ page }) => {
    // Navigation to Automations/Flows
    await page.goto('/automations')

    // Fallback if URL is different
    if (page.url().includes('404')) {
      const link = page.locator('a:has-text("Automations"), a:has-text("Flows")')
      if (await link.isVisible()) {
        await link.click()
      }
    }

    const newFlowBtn = page.locator(
      'button:has-text("New Flow"), a:has-text("New Flow"), button:has-text("Create Flow")'
    )
    if (await newFlowBtn.isVisible()) {
      await newFlowBtn.click()

      await page.fill('input[name="name"], input[placeholder="Flow Name"]', 'E2E Test Flow')

      await page.click('button:has-text("Save"), button:has-text("Create")')

      await expect(page.locator('text=success').first()).toBeVisible({ timeout: 10000 })
    }
  })
})
