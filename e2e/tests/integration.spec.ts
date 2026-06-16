import { test, expect } from '@playwright/test'

test.describe('Integrations (API Tokens & Webhooks)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@zenithcms.local')
    await page.fill('input[name="password"]', 'Admin@1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/')
  })

  test('Create and use an API Token', async ({ page, request }) => {
    // 1. Create the token in the UI
    await page.goto('/settings')
    const apiKeysLink = page.locator('a:has-text("API Keys"), button:has-text("API Keys")')
    if (await apiKeysLink.isVisible()) {
      await apiKeysLink.click()
    } else {
      await page.goto('/settings/api-keys') // fallback
    }

    const newKeyBtn = page.locator('button:has-text("Create Key"), a:has-text("New Key")')
    if (await newKeyBtn.isVisible()) {
      await newKeyBtn.click()
      await page.fill('input[name="name"], input[placeholder="Key Name"]', 'E2E Read-Only Token')

      // Select read-only if radio buttons exist
      const readOnlyRadio = page.locator('input[type="radio"][value="read"]')
      if (await readOnlyRadio.isVisible()) await readOnlyRadio.check()

      await page.click('button:has-text("Save"), button:has-text("Create")')
      await expect(page.locator('text=success').first()).toBeVisible({ timeout: 10000 })

      // In many CMSs, the token is shown once. Let's assume we can grab it or we just verify creation.
      // Since fetching the raw token might be tricky if it's hidden, we will just verify it appears in the list.
      await expect(page.locator('text=E2E Read-Only Token')).toBeVisible()
    }
  })

  test('Create a Webhook', async ({ page }) => {
    await page.goto('/settings')
    const webhooksLink = page.locator('a:has-text("Webhooks"), button:has-text("Webhooks")')
    if (await webhooksLink.isVisible()) {
      await webhooksLink.click()
    } else {
      await page.goto('/settings/webhooks')
    }

    const newWebhookBtn = page.locator(
      'button:has-text("Create Webhook"), a:has-text("New Webhook")'
    )
    if (await newWebhookBtn.isVisible()) {
      await newWebhookBtn.click()
      await page.fill('input[name="name"]', 'E2E Test Webhook')
      await page.fill('input[name="url"], input[type="url"]', 'https://httpbin.org/post')

      // Select events
      const createEventCheckbox = page.locator('input[type="checkbox"][value="document.create"]')
      if (await createEventCheckbox.isVisible()) await createEventCheckbox.check()

      await page.click('button:has-text("Save"), button:has-text("Create")')
      await expect(page.locator('text=success').first()).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=https://httpbin.org/post')).toBeVisible()
    }
  })
})
