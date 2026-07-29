#!/usr/bin/env node
/**
 * KonutArsa — IndexNow gönderimi (bkz. madde 26).
 *
 * Yalnızca INDEXNOW_ENABLED=true VE geçerli bir INDEXNOW_KEY tanımlıysa
 * çalışır; aksi hâlde güvenli biçimde atlanır (exit 0). Yalnızca son commit
 * aralığında değişen, taslak/noindex OLMAYAN production içerik URL'lerini
 * gönderir. Git geçmişi mevcut değilse (ör. sığ/shallow checkout) tüm
 * yayımlanmış URL'leri göndermek yerine güvenli şekilde atlar ve bunu
 * açıkça loglar — bu script'in başarısız olması production build'ini
 * ASLA bozmamalıdır.
 *
 * Kullanım: node scripts/submit-indexnow.mjs [--base <git-ref>]
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { resolveLocationRef } from '../src/lib/locations.ts';
import { slugify } from '../src/lib/slug.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const INDEXNOW_ENABLED = process.env.INDEXNOW_ENABLED === 'true';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? '';
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://konutarsa.com').replace(/\/+$/, '');
const SITE_HOST = new URL(SITE_URL).host;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

const COLLECTION_URL_PREFIXES = {
  'konut-rehberi': '/konut-rehberi',
  'arsa-rehberi': '/arsa-rehberi',
  mevzuat: '/mevzuat',
  'piyasa-raporlari': '/piyasa-raporlari',
  guncel: '/guncel',
  sozluk: '/sozluk',
};

function getBaseRef() {
  const argIndex = process.argv.indexOf('--base');
  if (argIndex !== -1 && process.argv[argIndex + 1]) return process.argv[argIndex + 1];
  return process.env.INDEXNOW_BASE_REF || 'HEAD~1';
}

function getChangedContentFiles(baseRef) {
  try {
    const output = execSync(`git diff --name-only ${baseRef} HEAD -- src/content`, {
      encoding: 'utf8',
      cwd: PROJECT_ROOT,
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.warn(`⚠️  Git diff alınamadı (${baseRef}): ${error.message.split('\n')[0]}`);
    return null;
  }
}

function fileToUrl(relativeFilePath) {
  const absolutePath = path.join(PROJECT_ROOT, relativeFilePath);
  if (!existsSync(absolutePath)) return null; // silinmiş dosya — gönderilecek URL yok

  const parsed = matter(readFileSync(absolutePath, 'utf8'));
  const data = parsed.data ?? {};
  if (data.status !== 'published') return null;
  if (data.seo?.noindex) return null;

  const segments = relativeFilePath.split(path.sep);
  const collection = segments[1]; // src/content/<collection>/<file>.md
  const slug = data.slug ?? slugify(path.basename(relativeFilePath, '.md'));

  if (collection === 'bolge-analizleri') {
    if (!data.locationRef) return null;
    const resolved = resolveLocationRef(data.locationRef);
    if (!resolved) return null;
    return `${SITE_URL}/bolge-analizleri/${resolved.urlPath}/${slug}/`;
  }

  const prefix = COLLECTION_URL_PREFIXES[collection];
  if (!prefix) return null;
  return `${SITE_URL}${prefix}/${slug}/`;
}

async function submitUrls(urls) {
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: SITE_HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  });
  return response;
}

async function main() {
  if (!INDEXNOW_ENABLED) {
    console.log('ℹ️  IndexNow devre dışı (INDEXNOW_ENABLED=true değil). Atlanıyor.');
    return;
  }
  if (!INDEXNOW_KEY) {
    console.log('ℹ️  INDEXNOW_KEY tanımlı değil. Güvenli şekilde atlanıyor.');
    return;
  }

  const baseRef = getBaseRef();
  const changedFiles = getChangedContentFiles(baseRef);

  if (changedFiles === null) {
    console.log(
      'ℹ️  Değişiklik geçmişi belirlenemedi (muhtemelen sığ/shallow checkout). Güvenli şekilde atlanıyor.'
    );
    return;
  }

  if (changedFiles.length === 0) {
    console.log('ℹ️  src/content altında değişen dosya yok. Gönderilecek URL yok.');
    return;
  }

  const urls = [...new Set(changedFiles.map(fileToUrl).filter((url) => url !== null))];

  if (urls.length === 0) {
    console.log(
      'ℹ️  Değişen dosyalar arasında indexlenebilir (yayımlanmış, noindex olmayan) URL bulunamadı.'
    );
    return;
  }

  console.log(`${urls.length} URL IndexNow'a gönderiliyor:`);
  urls.forEach((url) => console.log(`  - ${url}`));

  try {
    const response = await submitUrls(urls);
    if (response.ok) {
      console.log(`✅ IndexNow gönderimi başarılı (HTTP ${response.status}).`);
    } else if (response.status === 429) {
      console.warn(`⚠️  IndexNow hız sınırına takıldı (HTTP 429). Bu, build'i başarısız yapmaz.`);
    } else {
      console.warn(
        `⚠️  IndexNow gönderimi beklenmeyen bir durum kodu döndürdü: HTTP ${response.status}.`
      );
    }
  } catch (error) {
    console.warn(`⚠️  IndexNow gönderimi başarısız oldu (ağ hatası olabilir): ${error.message}`);
    console.warn("   Bu hata production build'ini başarısız yapmaz.");
  }
}

main().catch((error) => {
  console.warn(
    "⚠️  IndexNow scripti beklenmedik bir hatayla karşılaştı, ancak build'i etkilemeyecek:",
    error.message
  );
});
