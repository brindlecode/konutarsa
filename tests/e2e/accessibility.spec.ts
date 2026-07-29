import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES_TO_CHECK = [
  { name: 'Ana sayfa', path: '/' },
  { name: 'Makale sayfası', path: '/konut-rehberi/kat-mulkiyeti-ve-kat-irtifaki-farki/' },
  { name: 'Kategori sayfası', path: '/konut-rehberi/' },
  { name: 'Arama sayfası', path: '/arama/' },
  { name: 'Konum bulucu', path: '/bolgeler/konum-bul/' },
  { name: 'Yazarlar sayfası', path: '/yazarlar/' },
  { name: '404 sayfası', path: '/bu-sayfa-hic-var-olmadi/' },
];

test.describe('Erişilebilirlik (axe-core, WCAG 2.2 AA)', () => {
  for (const { name, path } of PAGES_TO_CHECK) {
    test(`${name} (${path}) WCAG 2.2 AA ihlali içermez`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();
      const details = results.violations
        .map(
          (v) =>
            `${v.id} (${v.impact ?? 'bilinmiyor'}): ${v.help} — ${v.nodes.length} öge — ${v.helpUrl}`
        )
        .join('\n');
      expect(results.violations, details).toEqual([]);
    });
  }

  test('mobil menü açıkken erişilebilirlik ihlali içermez', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('[data-mobile-nav] summary').click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    const details = results.violations
      .map(
        (v) =>
          `${v.id} (${v.impact ?? 'bilinmiyor'}): ${v.help} — ${v.nodes.length} öge — ${v.helpUrl}`
      )
      .join('\n');
    expect(results.violations, details).toEqual([]);
  });
});
