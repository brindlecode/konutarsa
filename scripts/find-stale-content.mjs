#!/usr/bin/env node
/**
 * KonutArsa — güncellik yönetimi (bkz. proje gereksinimleri madde 31).
 *
 * Yayımlanmış içerikleri yaşlarına göre raporlar. Bu script BLOCKING DEĞİLDİR
 * — CI build'ini durdurmaz, yalnızca reports/ altına bir rapor yazar. Kaynak
 * bağlantılarının erişilebilirliğini test eden ağ kontrolü de ayrı ve
 * non-blocking'tir; ağ erişimi yoksa (ör. sandboxlı CI ortamı) sessizce atlanır.
 *
 * Kullanım: node scripts/find-stale-content.mjs
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTENT_ROOT = path.join(PROJECT_ROOT, 'src', 'content');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');

const STALE_THRESHOLDS_DAYS = {
  guncel: 180,
  'piyasa-raporlari': 365,
  mevzuat: 365,
  'konut-rehberi': 540,
  'arsa-rehberi': 540,
  'bolge-analizleri': 540,
};

const SKIP_NETWORK_CHECK = process.env.STALE_CHECK_SKIP_NETWORK === 'true';
const NETWORK_TIMEOUT_MS = 5000;

function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(dir, entry.name));
}

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

async function checkSourceReachable(url) {
  if (SKIP_NETWORK_CHECK) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return null; // ağ hatası / zaman aşımı: bilinmiyor olarak işaretle, hata sayma
  }
}

async function main() {
  const collections = Object.keys(STALE_THRESHOLDS_DAYS);
  const staleItems = [];
  const sourceChecks = [];

  for (const collection of collections) {
    const threshold = STALE_THRESHOLDS_DAYS[collection];
    const dir = path.join(CONTENT_ROOT, collection);

    for (const filePath of listMarkdownFiles(dir)) {
      const parsed = matter(readFileSync(filePath, 'utf8'));
      const data = parsed.data ?? {};
      if (data.status !== 'published') continue;

      const referenceDate = data.updatedAt ?? data.publishedAt;
      if (!referenceDate) continue;
      const age = daysSince(referenceDate);

      if (age > threshold) {
        staleItems.push({
          file: path.relative(PROJECT_ROOT, filePath),
          collection,
          title: data.title,
          ageDays: age,
          thresholdDays: threshold,
          lastUpdated: referenceDate,
        });
      }

      for (const source of data.sources ?? []) {
        if (source.url)
          sourceChecks.push({
            file: path.relative(PROJECT_ROOT, filePath),
            key: source.key,
            url: source.url,
          });
      }
    }
  }

  console.log(`Güncellik kontrolü: ${staleItems.length} eski içerik bulundu.`);

  const unreachableSources = [];
  if (!SKIP_NETWORK_CHECK && sourceChecks.length > 0) {
    console.log(
      `${sourceChecks.length} kaynak bağlantısı kontrol ediliyor (ağ erişimi gerektirir, non-blocking)...`
    );
    for (const check of sourceChecks) {
      const reachable = await checkSourceReachable(check.url);
      if (reachable === false) unreachableSources.push(check);
    }
  } else {
    console.log(
      'Kaynak erişilebilirlik kontrolü atlandı (STALE_CHECK_SKIP_NETWORK=true veya ağ erişimi yok).'
    );
  }

  mkdirSync(REPORTS_DIR, { recursive: true });

  const jsonReport = {
    generatedAt: new Date().toISOString(),
    staleItems,
    unreachableSources,
  };
  writeFileSync(
    path.join(REPORTS_DIR, 'stale-content.json'),
    JSON.stringify(jsonReport, null, 2) + '\n'
  );

  const mdLines = ['# Güncellik Raporu', '', `Oluşturulma: ${jsonReport.generatedAt}`, ''];
  mdLines.push('## Eski içerikler');
  if (staleItems.length === 0) {
    mdLines.push('', 'Eski işaretli içerik bulunamadı.');
  } else {
    mdLines.push(
      '',
      '| Dosya | Koleksiyon | Yaş (gün) | Eşik (gün) |',
      '| --- | --- | --- | --- |'
    );
    for (const item of staleItems) {
      mdLines.push(
        `| ${item.file} | ${item.collection} | ${item.ageDays} | ${item.thresholdDays} |`
      );
    }
  }
  mdLines.push('', '## Erişilemeyen kaynaklar');
  if (unreachableSources.length === 0) {
    mdLines.push(
      '',
      SKIP_NETWORK_CHECK ? 'Ağ kontrolü atlandı.' : 'Tüm kaynaklar erişilebilir görünüyor.'
    );
  } else {
    mdLines.push('', '| Dosya | Kaynak anahtarı | URL |', '| --- | --- | --- |');
    for (const item of unreachableSources) {
      mdLines.push(`| ${item.file} | ${item.key} | ${item.url} |`);
    }
  }
  writeFileSync(path.join(REPORTS_DIR, 'stale-content.md'), mdLines.join('\n') + '\n');

  console.log(`✅ Rapor yazıldı: reports/stale-content.json, reports/stale-content.md`);
  // Bu script her koşulda başarıyla sonlanır (non-blocking); bulgular yalnızca bilgilendirme amaçlıdır.
}

main().catch((error) => {
  console.error('❌ HATA: Güncellik kontrolü beklenmedik şekilde başarısız oldu.', error);
  process.exit(1);
});
