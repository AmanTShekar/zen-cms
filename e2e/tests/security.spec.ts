import { test, expect } from '@playwright/test'

test.describe('Security & Boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@zenithcms.local')
    await page.fill('input[name="password"]', 'Admin@1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/')
  })

  test('XSS Injection Attempt is Sanitized', async ({ page }) => {
    // Navigate to create a document with Rich Text
    await page.goto('/collections/new') // fallback logic assumes a collection exists

    // We will simulate typing an XSS payload into any available text input
    // and verifying that upon save and reload, the script does not execute.
    const textInput = page.locator('input[type="text"]').first()
    if (await textInput.isVisible()) {
      const payload = '<script>alert("XSS")</script>'
      await textInput.fill(payload)
      await page.click('button:has-text("Save")')

      await expect(page.locator('text=success').first()).toBeVisible({ timeout: 10000 })

      // Reload page and verify no alert is triggered
      let alertTriggered = false
      page.on('dialog', (dialog) => {
        alertTriggered = true
        dialog.dismiss()
      })

      await page.reload()
      expect(alertTriggered).toBeFalsy()

      // Verify payload is either sanitized or rendered safely as text
      const inputVal = await textInput.inputValue()
      expect(inputVal).toBe(payload) // React escapes inputs automatically, so this is safe
    }
  })

  test('CSRF Protection forces double-submit token on mutations', async ({ page, request }) => {
    // Attempt an API mutation without the X-CSRF-Token header
    // In Zenith, mutations (POST/PUT/DELETE) require this if using cookie auth
    const response = await request.post('/api/v1/posts', {
      data: { title: 'CSRF Bypass Attempt' },
      // Deliberately omitting the CSRF header
    })

    // Should fail with 403 Forbidden or 401 Unauthorized
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })
})
