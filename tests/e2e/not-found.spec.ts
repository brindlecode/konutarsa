import { test, expect } from '@playwright/test';

test.describe('404 sayfası', () => {
  test('var olmayan bir yol 404 sayfasını gösterir', async ({ page }) => {
    const response = await page.goto('/bu-sayfa-hic-var-olmadi/');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('404', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Aradığınız sayfa bulunamadı'
    );
  });

  test('arama ve ana kategorilere bağlantı verir, noindex işaretlidir', async ({ page }) => {
    await page.goto('/bu-sayfa-hic-var-olmadi/');
    await expect(page.locator('#main-content [data-search-button]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ana sayfaya dön' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
