#!/usr/bin/env node
/**
 * KonutArsa — build çıktısı dosya sayısı kontrolü (bkz. madde 2.2).
 *
 * Cloudflare Pages ücretsiz planının dosya sayısı sınırına karşı güvenlik
 * payı sağlar: 12.000 dosyada uyarı, 15.000 dosyada build'i durdurur (exit 1).
 * Cloudflare Pages'in güncel resmî sınırlarını deployment öncesinde
 * DEPLOYMENT_CLOUDFLARE_TR.md'de belirtilen kaynaktan doğrulayın.
 */
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

const WARNING_THRESHOLD = 12_000;
const HARD_LIMIT = 15_000;

function countFiles(dir) {
  let count = 0;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(fullPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

if (!statSync(DIST_DIR, { throwIfNoEntry: false })) {
  console.error(
    `❌ HATA: Build çıktısı bulunamadı: ${DIST_DIR}. Önce "astro build" çalıştırılmalı.`
  );
  process.exit(1);
}

const totalFiles = countFiles(DIST_DIR);

console.log(`Build çıktısı dosya sayısı: ${totalFiles}`);
console.log(`Uyarı eşiği: ${WARNING_THRESHOLD} | Sınır: ${HARD_LIMIT}`);

if (totalFiles >= HARD_LIMIT) {
  console.error(
    `\n❌ HATA: Build çıktısı ${totalFiles} dosya içeriyor — bu, ${HARD_LIMIT} dosya sınırına ulaşmış veya ` +
      'aşmış demektir. Build durduruldu.\n' +
      '   Olası nedenler: yeni bir içerik türü için sayfa sayısı beklenmedik şekilde arttı, görsel varyasyonları ' +
      'çoğaldı veya konum verisinden yanlışlıkla sayfa üretildi (32.311 mahalle için sayfa üretilmemelidir).'
  );
  process.exit(1);
}

if (totalFiles >= WARNING_THRESHOLD) {
  console.warn(
    `\n⚠️  UYARI: Build çıktısı ${totalFiles} dosya içeriyor — ${HARD_LIMIT} sınırına yaklaşılıyor. ` +
      'Yeni statik sayfa/görsel varyasyonu eklerken dikkatli olun.'
  );
}

console.log('\n✅ Dosya sayısı kontrolü tamamlandı.');
