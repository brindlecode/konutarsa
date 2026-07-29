#!/usr/bin/env node
/**
 * KonutArsa — kırık iç bağlantı kontrolü.
 *
 * dist/ build çıktısındaki her HTML sayfasını tarar ve site-içi <a href>
 * bağlantılarının gerçekten üretilmiş bir sayfaya karşılık gelip gelmediğini
 * doğrular. Haricî bağlantılar (başka alan adları) bu script'in kapsamı
 * dışındadır — bunlar için ayrı ve ağ erişimi gerektiren bir kontrol
 * scripts/find-stale-content.mjs içinde (non-blocking) yapılır.
 *
 * Kullanım: node scripts/check-links.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://konutarsa.com').replace(/\/+$/, '');

function listHtmlFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractHrefs(html) {
  return [...html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)].map((match) => match[1]);
}

function resolveDistPathForPathname(pathname) {
  const clean = pathname.split('#')[0].split('?')[0];
  if (clean === '' || clean === '/') return path.join(DIST_DIR, 'index.html');
  if (clean.endsWith('/')) return path.join(DIST_DIR, clean, 'index.html');
  if (path.extname(clean)) return path.join(DIST_DIR, clean);
  // uzantısız yol: hem "path.html" hem "path/index.html" olasılığını kontrol et
  const asFile = path.join(DIST_DIR, `${clean}.html`);
  const asDirIndex = path.join(DIST_DIR, clean, 'index.html');
  return existsSync(asFile) ? asFile : asDirIndex;
}

function isCheckablePathname(href) {
  if (href.startsWith(`${SITE_URL}/`) || href === SITE_URL) return true;
  return href.startsWith('/');
}

if (!existsSync(DIST_DIR)) {
  console.error(`❌ HATA: ${DIST_DIR} bulunamadı. Önce "astro build" çalıştırılmalı.`);
  process.exit(1);
}

const htmlFiles = listHtmlFiles(DIST_DIR);
const brokenLinks = [];
const checkedHrefCache = new Map();

for (const filePath of htmlFiles) {
  const html = readFileSync(filePath, 'utf8');
  const hrefs = extractHrefs(html);

  for (const href of hrefs) {
    if (
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('#') ||
      href.startsWith('javascript:')
    ) {
      continue;
    }
    if (!isCheckablePathname(href)) continue; // haricî bağlantı, bu kontrolün kapsamı dışında

    if (checkedHrefCache.has(href)) {
      if (!checkedHrefCache.get(href)) {
        brokenLinks.push({ file: path.relative(DIST_DIR, filePath), href });
      }
      continue;
    }

    const pathname = href.startsWith(SITE_URL) ? href.slice(SITE_URL.length) || '/' : href;
    const targetPath = resolveDistPathForPathname(pathname);
    const exists = existsSync(targetPath);
    checkedHrefCache.set(href, exists);
    if (!exists) {
      brokenLinks.push({ file: path.relative(DIST_DIR, filePath), href });
    }
  }
}

console.log(`Taranan HTML sayfası: ${htmlFiles.length}`);
console.log(`Kontrol edilen benzersiz iç bağlantı: ${checkedHrefCache.size}`);

if (brokenLinks.length > 0) {
  console.error(`\n❌ ${brokenLinks.length} kırık iç bağlantı bulundu:\n`);
  for (const { file, href } of brokenLinks) {
    console.error(`  [${file}] → ${href}`);
  }
  process.exit(1);
}

console.log('\n✅ Kırık iç bağlantı bulunamadı.');
