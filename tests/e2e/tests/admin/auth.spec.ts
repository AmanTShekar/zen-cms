import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {

  test('successfully logs in with valid credentials', async ({ page }) => {
    await page.route('**/api/v1/auth/setup-status', async route => {
      await route.fulfill({ status: 200, json: { data: { needsSetup: false } } });
    });

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            user: { id: 'user123', email: 'admin@zenith.com', role: 'admin' },
            token: 'mock-token'
          }
        }
      });
    });

    await page.goto('/login');

    await expect(page.locator('h2')).toContainText('Sign In');
    await expect(page.locator('text=Access Controlled')).toBeVisible();

    await page.fill('input[name="email"]', 'admin@zenith.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/$/);
  });

  test('shows error message for invalid credentials and renders cooldown/attempts', async ({ page }) => {
    await page.route('**/api/v1/auth/setup-status', async route => {
      await route.fulfill({ status: 200, json: { data: { needsSetup: false } } });
    });

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 401,
        json: {
          message: 'Access Denied: Invalid Username or Password',
          data: { attemptsLeft: 3, maxAttempts: 5 }
        }
      });
    });

    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@zenith.com');
    await page.fill('input[name="password"]', 'BadPassword!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Access Denied: Invalid Username or Password')).toBeVisible();
    await expect(page.locator('text=3 of 5 remaining')).toBeVisible();
  });

  test('handles 2FA challenge correctly', async ({ page }) => {
    await page.route('**/api/v1/auth/setup-status', async route => {
      await route.fulfill({ status: 200, json: { data: { needsSetup: false } } });
    });

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 403,
        json: {
          data: { require2FA: true, tempToken: 'mock-temp-token' }
        }
      });
    });

    await page.route('**/api/v1/auth/2fa/verify-login', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            user: { id: 'user123', email: 'admin@zenith.com', role: 'admin' },
            token: 'mock-token'
          }
        }
      });
    });

    await page.goto('/login');

    await page.fill('input[name="email"]', 'admin@zenith.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // UI should switch to 2FA input
    await expect(page.locator('h2')).toContainText('Two-Factor Auth');
    await expect(page.locator('text=6-Digit Authenticator Code')).toBeVisible();

    // Type 6 digit code
    await page.fill('input[placeholder="000000"]', '123456');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/$/);
  });

  test('shows setup UI if system requires initial provisioning', async ({ page }) => {
    await page.route('**/api/v1/auth/setup-status', async route => {
      await route.fulfill({ status: 200, json: { data: { needsSetup: true } } });
    });

    await page.route('**/api/v1/auth/setup', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: {
            user: { id: 'newadmin', email: 'setup@zenith.com', role: 'admin' }
          }
        }
      });
    });

    await page.goto('/login');

    await expect(page.locator('h2')).toContainText('Setup Admin');
    await expect(page.locator('text=Initialize Workstation')).toBeVisible();
    await expect(page.locator('text=No administrative users detected.')).toBeVisible();

    await page.fill('input[name="email"]', 'setup@zenith.com');
    await page.fill('input[name="password"]', 'SuperSecure1!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/setup$/);
  });

  test('handles network offline error', async ({ page }) => {
    await page.route('**/api/v1/auth/setup-status', async route => {
      await route.abort('failed'); // simulate network failure
    });

    await page.route('**/api/v1/auth/login', async route => {
      await route.abort('failed'); // simulate network failure
    });

    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@test.com');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Kernel Offline: Connection Refused')).toBeVisible();
  });
});
