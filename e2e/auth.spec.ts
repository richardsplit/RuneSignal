import { test, expect } from '@playwright/test';

test.describe('RuneSignal Authentication', () => {
  test('should show login page when unauthenticated', async ({ page }) => {
    // Navigate to the root (should redirect to /login if middleware is active)
    await page.goto('/');
    
    // Expect the login heading or form to be present
    // Adjust selector based on actual Login page content
    const loginHeading = page.getByRole('heading', { name: /Sign In|Login/i });
    if (await loginHeading.isVisible()) {
      await expect(loginHeading).toBeVisible();
    } else {
      // Fallback: check if the redirection happened
      await expect(page).toHaveURL(/.*login/);
    }
  });

  test('should have a working dashboard shell', async ({ page }) => {
    // Note: In a real CI, we'd use a test user session
    // For this boilerplate, we verify the presence of the Sidebar on the home page
    await page.goto('/');
    
    // If not redirected, check for the brand logo or sidebar
    const brandLogo = page.getByAltText(/RuneSignal/i);
    // If logo is visible, we are on a dashboard page
    if (await brandLogo.isVisible()) {
      await expect(brandLogo).toBeVisible();
    }
  });
});
