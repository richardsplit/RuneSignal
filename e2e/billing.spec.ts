import { test, expect } from '@playwright/test';

test.describe('RuneSignal Billing & Usage', () => {
  test('should display pricing plans correctly', async ({ page }) => {
    // Navigate to the billing page
    await page.goto('/billing');
    
    // Expect the title to be present
    await expect(page.getByRole('heading', { name: /Subscription|Plans/i })).toBeVisible();
    
    // Expect all three tiers to be listed
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Pro')).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();
  });

  test('should show usage metering section', async ({ page }) => {
    await page.goto('/billing');
    
    // Expect the usage metering section title
    await expect(page.getByText(/Monthly Consumption|Usage & Metering/i)).toBeVisible();
    
    // Check for progress bar container
    const progressBar = page.locator('div[style*="height: 12px"]');
    await expect(progressBar).toBeVisible();
  });

  test('button states based on current tier', async ({ page }) => {
    await page.goto('/billing');
    
    // The "Starter" or "Active Plan" button should be disabled for a free/starter user
    const starterButton = page.getByRole('button', { name: /Active Plan|Current Plan/i });
    if (await starterButton.isVisible()) {
      await expect(starterButton).toBeDisabled();
    }
  });
});
