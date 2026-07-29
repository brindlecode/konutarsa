import { test, expect } from '@playwright/test';

test.describe('Konum bulucu', () => {
  test('il seçilince ilçe listesi ve mahalle arama alanı aktifleşir', async ({ page }) => {
    await page.goto('/bolgeler/konum-bul/');
    const provinceSelect = page.locator('#province-select');
    const districtSelect = page.locator('#district-select');
    const neighborhoodInput = page.locator('#neighborhood-search');

    await expect(districtSelect).toBeDisabled();
    await expect(neighborhoodInput).toBeDisabled();

    await provinceSelect.selectOption('canakkale');
    await expect(districtSelect).toBeEnabled();
    await expect(neighborhoodInput).toBeEnabled();
    await expect(page.locator('#location-finder-status')).toContainText('yüklendi', {
      timeout: 10_000,
    });
    await expect(districtSelect.getByRole('option', { name: 'Merkez' })).toHaveCount(1);
  });

  test('mahalle adı yazınca sonuç listelenir ve locationRef kopyalanabilir', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/bolgeler/konum-bul/');

    await page.locator('#province-select').selectOption('canakkale');
    await expect(page.locator('#location-finder-status')).toContainText('yüklendi', {
      timeout: 10_000,
    });

    await page.locator('#neighborhood-search').fill('barbaros');
    const firstResult = page.locator('.location-result').first();
    await expect(firstResult).toBeVisible({ timeout: 10_000 });
    await expect(firstResult.locator('code')).toHaveText(/^neighborhood:m-\d{6}$/);

    await firstResult.getByRole('button', { name: 'Kopyala' }).click();
    await expect(firstResult.getByRole('button', { name: 'Kopyalandı!' })).toBeVisible();
  });

  test('ilçe filtresi mahalle sonuçlarını daraltır', async ({ page }) => {
    await page.goto('/bolgeler/konum-bul/');
    await page.locator('#province-select').selectOption('canakkale');
    await expect(page.locator('#location-finder-status')).toContainText('yüklendi', {
      timeout: 10_000,
    });

    await page.locator('#district-select').selectOption('merkez');
    await page.locator('#neighborhood-search').fill('a');
    const results = page.locator('.location-result');
    await expect(results.first()).toBeVisible({ timeout: 10_000 });
    const count = await results.count();
    for (let i = 0; i < count; i++) {
      await expect(results.nth(i).locator('.location-result-hierarchy')).toContainText('Merkez');
    }
  });
});
