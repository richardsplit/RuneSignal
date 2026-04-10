import { test, expect } from '@playwright/test';

test.describe('TrustLayer Dashboard Navigation', () => {
  test('landing page loads without server error', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(500);
  });

  test('redirects unauthenticated users away from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/(login|auth|sign-in|$)/);
  });

  test('login page renders email input', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  });

  test('plugins page loads without server error', async ({ page }) => {
    const res = await page.goto('/plugins');
    expect(res?.status()).toBeLessThan(500);
  });

  test('soul-marketplace page loads without server error', async ({ page }) => {
    const res = await page.goto('/soul-marketplace');
    expect(res?.status()).toBeLessThan(500);
  });

  test('sovereignty page loads without server error', async ({ page }) => {
    const res = await page.goto('/sovereignty');
    expect(res?.status()).toBeLessThan(500);
  });

  test('account-settings page loads without server error', async ({ page }) => {
    const res = await page.goto('/account-settings');
    expect(res?.status()).toBeLessThan(500);
  });

  test('account-settings MFA page loads without server error', async ({ page }) => {
    const res = await page.goto('/account-settings/mfa');
    expect(res?.status()).toBeLessThan(500);
  });
});
