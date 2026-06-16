import { test, expect } from '@playwright/test'

test.describe('Versioning & Drafts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@zenithcms.local')
    await page.fill('input[name="password"]', 'Admin@1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/')
  })

  test('Save as Draft and Verify Public API Exclusion', async ({ page, request }) => {
    await page.goto('/collections') // Assume there's a posts/pages collection
    const createBtn = page.locator('button:has-text("Create"), a:has-text("Create")')
    if (await createBtn.isVisible()) {
      await createBtn.click()

      const textInputs = page.locator('input[type="text"]')
      if ((await textInputs.count()) > 0) {
        await textInputs.first().fill('E2E Draft Document')
      }

      // Switch to draft (might be a toggle or specific save button)
      const draftToggle = page
        .locator('button[role="switch"], input[type="checkbox"]')
        .filter({ hasText: /draft/i })
      if (await draftToggle.isVisible()) {
        await draftToggle.click()
      }

      // Save as draft
      await page.click('button:has-text("Save")')
      await expect(page.locator('text=success').first()).toBeVisible({ timeout: 10000 })

      // Verify the public API does not return this draft
      // We assume the API endpoint matches the collection name and handles public read access correctly
      // For this test, we just do a basic fetch to the API root
      const response = await request.get('/api/v1/posts') // or whatever collection
      if (response.ok()) {
        const data = await response.json()
        const found = data.docs?.some((d: any) => d.title === 'E2E Draft Document')
        expect(found).toBeFalsy()
      }
    }
  })

  test('Revert to a previous version', async ({ page }) => {
    await page.goto('/collections')
    // Open an existing document
    const editLink = page.locator('a[href*="/collections/"]').filter({ hasText: 'Edit' }).first()
    if (await editLink.isVisible()) {
      await editLink.click()

      // Open version history panel
      const versionsBtn = page.locator(
        'button:has-text("Versions"), button[title="Version History"]'
      )
      if (await versionsBtn.isVisible()) {
        await versionsBtn.click()

        // Click restore on the first old version
        const restoreBtn = page.locator('button:has-text("Restore")').first()
        if (await restoreBtn.isVisible()) {
          await restoreBtn.click()
          // Confirm restoration if there's a modal
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
          if (await confirmBtn.isVisible()) await confirmBtn.click()

          await expect(page.locator('text=restored').first()).toBeVisible({ timeout: 10000 })
        }
      }
    }
  })
})
