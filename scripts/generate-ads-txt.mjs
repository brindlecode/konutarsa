#!/usr/bin/env node
/**
 * KonutArsa — ads.txt üretimi.
 *
 * Gerçek bir AdSense publisher ID (PUBLIC_ADSENSE_CLIENT, "ca-pub-..." biçiminde)
 * tanımlı değilse GEÇERSİZ bir placeholder satırı asla yazılmaz (bkz. madde 22.4,
 * kesin yasaklar: "AdSense ID uydurma"). Bunun yerine yalnızca ne yapılması
 * gerektiğini açıklayan bir yorum dosyası üretilir.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public', 'ads.txt');

const adsenseClient = process.env.PUBLIC_ADSENSE_CLIENT ?? '';
const CLIENT_PATTERN = /^ca-pub-\d{10,}$/;

function buildAdsTxt() {
  if (adsenseClient && CLIENT_PATTERN.test(adsenseClient)) {
    const pubId = adsenseClient.replace(/^ca-/, '');
    return [
      '# KonutArsa ads.txt',
      '# Otomatik üretilir: scripts/generate-ads-txt.mjs — elle düzenlemeyin.',
      `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`,
      '',
    ].join('\n');
  }

  return [
    '# KonutArsa ads.txt',
    '#',
    '# Henüz gerçek bir AdSense publisher ID tanımlanmadı, bu yüzden geçerli',
    '# bir satır üretilmedi (sahte/placeholder ID yayımlamak yasaktır).',
    '#',
    '# AdSense onayı alındıktan sonra:',
    '#   1. PUBLIC_ADSENSE_CLIENT ortam değişkenini "ca-pub-XXXXXXXXXXXXXXXX"',
    '#      biçiminde ayarlayın (bkz. ADSENSE_SETUP_TR.md).',
    '#   2. pnpm ads:generate komutunu (veya normal build sürecini) tekrar',
    '#      çalıştırın; bu dosya geçerli bir "google.com, pub-..., DIRECT, ..."',
    '#      satırıyla otomatik olarak yeniden üretilecektir.',
    '',
  ].join('\n');
}

mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, buildAdsTxt());

if (adsenseClient && CLIENT_PATTERN.test(adsenseClient)) {
  console.log(
    `✅ ads.txt geçerli publisher ID ile üretildi: ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`
  );
} else {
  console.log(
    `ℹ️  ads.txt yalnızca açıklama yorumu olarak üretildi (PUBLIC_ADSENSE_CLIENT tanımlı değil veya geçersiz).`
  );
}
