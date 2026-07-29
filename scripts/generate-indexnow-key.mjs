#!/usr/bin/env node
/**
 * KonutArsa — IndexNow anahtarı üretimi (bkz. madde 26.1).
 *
 * IndexNow protokolü, anahtarın "https://SITE/{anahtar}.txt" adresinde
 * anahtarın kendisini içeren bir dosya olarak yayımlanmasını gerektirir.
 * Bu script yeni bir anahtar üretir, public/ altına ilgili dosyayı yazar ve
 * .env dosyanıza eklemeniz gereken değeri ekrana yazdırır.
 *
 * Kullanım: node scripts/generate-indexnow-key.mjs
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

const KEY_FILE_PATTERN = /^[a-f0-9]{32}\.txt$/;

function removeStaleKeyFiles() {
  for (const entry of readdirSync(PUBLIC_DIR, { withFileTypes: true })) {
    if (entry.isFile() && KEY_FILE_PATTERN.test(entry.name)) {
      unlinkSync(path.join(PUBLIC_DIR, entry.name));
      console.log(`Eski anahtar dosyası kaldırıldı: public/${entry.name}`);
    }
  }
}

const key = randomBytes(16).toString('hex');

mkdirSync(PUBLIC_DIR, { recursive: true });
removeStaleKeyFiles();
writeFileSync(path.join(PUBLIC_DIR, `${key}.txt`), `${key}\n`);

console.log('\n✅ Yeni IndexNow anahtarı üretildi.');
console.log(`   Dosya: public/${key}.txt`);
console.log(
  '\nBu değerleri ortam değişkenlerinize (Cloudflare Pages ayarları veya .env) ekleyin:\n'
);
console.log(`  INDEXNOW_ENABLED=true`);
console.log(`  INDEXNOW_KEY=${key}`);
console.log(
  "\nNot: Anahtar dosyası (public/*.txt) her build'de korunur; yalnızca bu script yeniden çalıştırıldığında değişir."
);
