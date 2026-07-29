import { test, expect } from '@playwright/test';

const ARTICLE_PATH = '/konut-rehberi/kat-mulkiyeti-ve-kat-irtifaki-farki/';

/**
 * Madde 41.4 duman testi: gerçek bir makale sayfasının temel SEO/AEO
 * gereksinimlerini (başlık, açıklama, canonical, robots, OG/Twitter,
 * Article+Breadcrumb şeması, H1, tarihler, yazar, görsel, kaynaklar,
 * sitemap varlığı) tek seferde doğrular.
 */
test.describe('SEO duman testi', () => {
  test('makale sayfası temel SEO/AEO gereksinimlerini karşılar', async ({ page, request }) => {
    await page.goto(ARTICLE_PATH);

    await expect(page).toHaveTitle(/Kat Mülkiyeti ve Kat İrtifakı.*KonutArsa/);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);
    const descriptionContent = await description.getAttribute('content');
    expect(descriptionContent && descriptionContent.length).toBeLessThanOrEqual(160);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', new RegExp(`${ARTICLE_PATH}$`));
    const canonicalHref = await canonical.getAttribute('href');
    expect(canonicalHref?.startsWith('https://')).toBe(true);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/);

    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /^https:\/\/.+/
    );
    await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute(
      'content',
      /^2026-06-18T/
    );
    await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute(
      'content',
      /^2026-07-05T/
    );

    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image'
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', /.+/);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Kat Mülkiyeti ve Kat İrtifakı'
    );

    const jsonLdTexts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const schemas = jsonLdTexts.map((t) => JSON.parse(t));
    const types = schemas.map((s) => s['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
    expect(types).toContain('BreadcrumbList');
    expect(types).toContain('Article');
    expect(types).toContain('FAQPage');

    const articleSchema = schemas.find((s) => s['@type'] === 'Article');
    expect(articleSchema.headline).toContain('Kat Mülkiyeti');
    expect(articleSchema.datePublished).toMatch(/^2026-06-18T/);
    expect(articleSchema.dateModified).toMatch(/^2026-07-05T/);
    expect(articleSchema.author?.name).toBe('Gamze Kaya');
    expect(articleSchema.image).toBeTruthy();
    expect(articleSchema.isAccessibleForFree).toBe(true);

    const breadcrumbSchema = schemas.find((s) => s['@type'] === 'BreadcrumbList');
    expect(breadcrumbSchema.itemListElement.length).toBeGreaterThanOrEqual(2);
    expect(breadcrumbSchema.itemListElement[0].item.startsWith('https://')).toBe(true);

    await expect(page.getByRole('link', { name: 'Gamze Kaya' }).first()).toBeVisible();
    await expect(page.locator('time[datetime]').first()).toBeVisible();
    await expect(page.locator('article img').first()).toHaveAttribute('alt', /.+/);
    await expect(page.locator('.sources-list')).toBeVisible();

    const sitemapIndex = await request.get('/sitemap-index.xml');
    expect(sitemapIndex.ok()).toBe(true);
    const sitemapIndexBody = await sitemapIndex.text();
    const sitemapEntryMatch = sitemapIndexBody.match(/<loc>([^<]*sitemap-\d+\.xml)<\/loc>/);
    expect(sitemapEntryMatch).not.toBeNull();

    const sitemapEntryUrl = new URL(sitemapEntryMatch![1]!);
    const sitemapEntry = await request.get(sitemapEntryUrl.pathname);
    expect(sitemapEntry.ok()).toBe(true);
    const sitemapEntryBody = await sitemapEntry.text();
    expect(sitemapEntryBody).toContain(ARTICLE_PATH);
  });
});
