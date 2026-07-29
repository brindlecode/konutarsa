import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Mobil menü', () => {
  test('açılır, klavye ile gezilir ve Escape ile kapanır', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-mobile-nav] summary');
    const panel = page.locator('[data-mobile-nav-panel]');

    await expect(panel).not.toBeVisible();
    await toggle.click();
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
    await expect(toggle).toBeFocused();
  });

  test('dışarı tıklanınca kapanır', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-mobile-nav] summary');
    const panel = page.locator('[data-mobile-nav-panel]');

    await toggle.click();
    await expect(panel).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(panel).not.toBeVisible();
  });

  test('JavaScript kapalıyken temel navigasyon (native details/summary) yine de kullanılabilir', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto('/');
    const toggle = page.locator('[data-mobile-nav] summary');
    const panel = page.locator('[data-mobile-nav-panel]');
    await expect(panel).not.toBeVisible();
    await toggle.click();
    await expect(panel).toBeVisible();
    await context.close();
  });
});
