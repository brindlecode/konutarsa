import { test, expect } from '@playwright/test';

test.describe('Ana sayfa', () => {
  test('açılır ve temel bölümleri gösterir', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/KonutArsa/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Konut veya arsa almadan önce araştırın'
    );
    await expect(page.getByRole('link', { name: 'Konut rehberlerini incele' })).toBeVisible();
  });

  test('ana navigasyon linkleri çalışır', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Konut Rehberi', exact: true }).first().click();
    await expect(page).toHaveURL(/\/konut-rehberi\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Konut Rehberi');
  });

  test('skip link odaklandığında görünür ve ana içeriğe atlar', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.locator('[data-skip-link]');
    await expect(skipLink).toBeFocused();
  });

  test('AdSense ve GA4 kapalıyken ilgili script etiketleri hiç render edilmez', async ({
    page,
  }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toContain('googlesyndication.com');
    expect(html).not.toContain('googletagmanager.com/gtag/js?id=');
    expect(html).not.toContain('adsbygoogle.js');
  });

  test('footer bağımsızlık ve sorumluluk reddi bağlantısı içerir', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Sorumluluk reddini okuyun' })).toBeVisible();
  });
});
