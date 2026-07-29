import { test, expect } from '@playwright/test';

test.describe('Site içi arama (Pagefind)', () => {
  test('bir terim yazınca sonuç listelenir', async ({ page }) => {
    await page.goto('/arama/');
    const input = page.locator('#search-input');
    await input.fill('kat mülkiyeti');
    await expect(page.locator('#search-status')).toContainText('sonuç bulundu', {
      timeout: 10_000,
    });
    await expect(page.locator('#search-results .search-result').first()).toBeVisible();
  });

  test('sonuç bulunmayan bir terimde bilgilendirici mesaj gösterilir', async ({ page }) => {
    await page.goto('/arama/');
    const input = page.locator('#search-input');
    await input.fill('zzzzzzzqqqqqqxxxxx-olmayan-terim');
    await expect(page.locator('#search-status')).toContainText('sonuç bulunamadı', {
      timeout: 10_000,
    });
    await expect(page.locator('#search-results .search-result')).toHaveCount(0);
  });

  test('içerik türü filtre çipleri sonuç geldikten sonra görünür', async ({ page }) => {
    await page.goto('/arama/');
    const input = page.locator('#search-input');
    await input.fill('tapu');
    await expect(page.locator('#search-status')).toContainText('sonuç bulundu', {
      timeout: 10_000,
    });
    await expect(page.locator('#search-filters')).toBeVisible();
    await expect(page.locator('.filter-chip').first()).toBeVisible();
  });

  test('temizle düğmesi arama kutusunu ve sonuçları sıfırlar', async ({ page }) => {
    await page.goto('/arama/');
    const input = page.locator('#search-input');
    await input.fill('tapu');
    await expect(page.locator('#search-clear')).toBeVisible();
    await page.locator('#search-clear').click();
    await expect(input).toHaveValue('');
    await expect(page.locator('#search-results .search-result')).toHaveCount(0);
  });

  test('?q= sorgu parametresiyle gelindiğinde arama otomatik çalışır', async ({ page }) => {
    await page.goto('/arama/?q=imar');
    await expect(page.locator('#search-input')).toHaveValue('imar');
    await expect(page.locator('#search-status')).toContainText('sonuç', { timeout: 10_000 });
  });
});
