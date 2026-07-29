import { test, expect } from '@playwright/test';

const ARTICLE_PATH = '/konut-rehberi/kat-mulkiyeti-ve-kat-irtifaki-farki/';

test.describe('Makale sayfası', () => {
  test('breadcrumb ve başlık doğru render edilir', async ({ page }) => {
    await page.goto(ARTICLE_PATH);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Kat Mülkiyeti ve Kat İrtifakı'
    );

    const breadcrumb = page.locator('nav.breadcrumbs');
    await expect(breadcrumb.getByRole('link', { name: 'Ana Sayfa' })).toBeVisible();
    await expect(breadcrumb.getByRole('link', { name: 'Konut Rehberi' })).toBeVisible();
    await expect(breadcrumb.locator('[aria-current="page"]')).toContainText('Kat Mülkiyeti');
  });

  test('yazar, yayın tarihi ve güncelleme tarihi görünür', async ({ page }) => {
    await page.goto(ARTICLE_PATH);
    await expect(page.getByRole('link', { name: 'Gamze Kaya' }).first()).toBeVisible();
    const times = page.locator('.article-header time[datetime]');
    await expect(times).toHaveCount(2);
    await expect(times.first()).toHaveAttribute('datetime', /^2026-06-18/);
    await expect(times.last()).toHaveAttribute('datetime', /^2026-07-05/);
  });

  test('kaynaklar listesi resmî kaynak rozetiyle birlikte gösterilir', async ({ page }) => {
    await page.goto(ARTICLE_PATH);
    const sources = page.locator('.sources-list');
    await expect(sources).toBeVisible();
    await expect(
      sources.getByRole('link', { name: '634 Sayılı Kat Mülkiyeti Kanunu' })
    ).toBeVisible();
    await expect(sources.getByText('Resmî kaynak')).toBeVisible();
  });

  test('sık sorulan sorular açılıp kapanabilir', async ({ page }) => {
    await page.goto(ARTICLE_PATH);
    const faqItem = page.locator('.faq-item').first();
    const answer = faqItem.locator('p');
    await expect(answer).not.toBeVisible();
    await faqItem.locator('summary').click();
    await expect(answer).toBeVisible();
  });

  test('bağlantıyı kopyala düğmesi geri bildirim gösterir', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(ARTICLE_PATH);
    await expect(page.locator('.copy-feedback')).toBeHidden();
    await page.locator('[data-share-copy]').click();
    await expect(page.locator('.copy-feedback')).toBeVisible();
  });

  test('sorumluluk reddi bağlantısı mevcut', async ({ page }) => {
    await page.goto(ARTICLE_PATH);
    const disclaimer = page.locator('.article-disclaimer');
    await expect(disclaimer.getByRole('link', { name: 'Sorumluluk reddini okuyun' })).toBeVisible();
  });
});
