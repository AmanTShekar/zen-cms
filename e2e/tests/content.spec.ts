import { test, expect } from '@playwright/test'

test.describe('Content Editing (CRUD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@zenithcms.local')
    await page.fill('input[name="password"]', 'Admin@1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/')
  })

  test('Create a new document', async ({ page }) => {
    // 1. Create a collection first
    await page.goto('/collections')
    await page.getByText('Create Collection').click()

    const uniqueSuffix = Date.now().toString()
    await page.fill('input[name="name"]', `E2E Content ${uniqueSuffix}`)
    await page.fill('input[name="slug"]', `e2e-content-${uniqueSuffix}`)
    await page.fill('input[name="field-name-0"]', 'title')

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/system/collections') && res.request().method() === 'POST'
      ),
      page.getByText('Create Content Type').click(),
    ])
    expect(response.status()).toBe(201)

    // 2. Go to the new collection's new record page
    await page.goto(`/collections/e2e-content-${uniqueSuffix}/new`)

    // Fill required fields - since we created it with a 'title' text input
    await page
      .getByPlaceholder('Enter Title...')
      .first()
      .fill('E2E Test Document ' + uniqueSuffix)

    // Click publish and confirm
    await page
      .getByRole('button', { name: /Publish/i })
      .first()
      .click()
    await page.getByRole('button', { name: /Publish Now/i }).click()

    // Wait a short time for save
    await page.waitForTimeout(2000)

    // If we get an error toast, log the page text to see what happened
    const currentUrl = page.url()
    if (currentUrl.endsWith('/new')) {
      console.log('Failed to redirect. Page text:', await page.locator('body').innerText())
    }

    // It should have redirected to the new document ID
    expect(page.url()).not.toContain('/new')

    // 3. Edit the document
    await page
      .getByPlaceholder('Enter Title...')
      .first()
      .fill('E2E Test Document ' + uniqueSuffix + ' - Updated')
    await page
      .getByRole('button', { name: /Publish/i })
      .first()
      .click()
    await page.getByRole('button', { name: /Publish Now/i }).click()
    await page.waitForTimeout(2000)

    // 4. Verify the update in the list view
    await page.goto(`/collections/e2e-content-${uniqueSuffix}`)
    await expect(
      page.getByText('E2E Test Document ' + uniqueSuffix + ' - Updated').first()
    ).toBeVisible()

    // 5. Delete the document
    await page.locator('tbody tr').first().locator('td').first().locator('button').click()
    await page.getByRole('button', { name: /Delete/i }).click()

    // Click the confirmation button
    await page.getByRole('button', { name: 'Confirm' }).click()
    await page.waitForTimeout(2000)

    // Check it's gone
    await expect(
      page.getByText('E2E Test Document ' + uniqueSuffix + ' - Updated').first()
    ).not.toBeVisible()
  })
})
