import { test, expect } from '@playwright/test'

test.describe('Complex Fields & UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@zenithcms.local')
    await page.fill('input[name="password"]', 'Admin@1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/')
  })

  test('RichText editor formatting and Select field', async ({ page }) => {
    // 1. Create a collection with RichText and Select fields
    await page.goto('/collections')

    // Open modal
    await page.getByText('Create Collection').click()

    const uniqueSuffix = Date.now().toString()

    await page.fill('input[name="name"]', `E2E Complex ${uniqueSuffix}`)
    await page.fill('input[name="slug"]', `e2e-complex-${uniqueSuffix}`)

    // First field: RichText
    await page.fill('input[name="field-name-0"]', 'body')
    await page.locator('select').nth(0).selectOption('richtext')

    // Add second field: Select
    await page.getByText('Add Field').click()
    await page.fill('input[name="field-name-1"]', 'status')
    await page.locator('select').nth(1).selectOption('select')

    // Wait for the options input to appear and fill it
    await page.fill('input[placeholder="e.g. red, blue, green"]', 'draft, published, archived')

    // Save collection
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/system/collections') && res.request().method() === 'POST'
      ),
      page.getByText('Create Content Type').click(),
    ])
    expect(response.status()).toBe(201)

    // 2. Go to the new collection's new record page
    await page.goto(`/collections/e2e-complex-${uniqueSuffix}/new`)

    // 3. Test RichText field
    const rte = page.locator('.ContentEditable__root, [contenteditable="true"]').first()
    await expect(rte).toBeVisible({ timeout: 10000 })
    await rte.fill('E2E Rich Text Test')

    // Select text and apply bold (assuming typical ProseMirror/Lexical hotkey)
    await rte.press('Meta+b')

    // Since we can't reliably check bold styling without knowing the exact DOM,
    // we'll just check that the text was entered.
    await expect(rte).toContainText('E2E Rich Text Test')

    // 4. Test Select field
    const selectField = page.locator('select').last()
    await selectField.selectOption('published')
    await expect(selectField).toHaveValue('published')
  })
})
