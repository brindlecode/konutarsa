#!/usr/bin/env node
/**
 * KonutArsa — robots.txt üretimi.
 *
 * Preview build'lerde (Cloudflare Pages production branch dışı) tüm botları
 * engelleyen katı bir robots.txt üretir (bkz. madde 34). Production'da genel
 * botlara izin verir; OAI-SearchBot ve GPTBot birbirinden bağımsız yönetilir
 * (bkz. madde 16.4) ve tercihler ALLOW_SEARCH_CRAWLERS / ALLOW_TRAINING_CRAWLERS
 * ortam değişkenleriyle kontrol edilir.
 *
 * noindex gereken bireysel sayfalar (arama, etiket dizini, ince etiket
 * sayfaları) burada Disallow ile EKLENMEZ: bir sayfayı Disallow etmek onun
 * hiç taranmasını engeller ve bu durumda arama motoru <meta name="robots"
 * content="noindex"> etiketini hiç göremez — bu da URL'nin açıklamasız/boş
 * biçimde dizine girmesi gibi istenmeyen bir sonuca yol açabilir. Bu yüzden
 * bu sayfalarda dizin dışı bırakma tamamen meta etiketiyle sağlanır.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public', 'robots.txt');

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://konutarsa.com').replace(/\/+$/, '');

function isProductionBuild() {
  const explicit = process.env.PUBLIC_BUILD_ENV;
  if (explicit === 'production') return true;
  if (explicit === 'preview' || explicit === 'development') return false;
  const cfPages = process.env.CF_PAGES;
  const cfBranch = process.env.CF_PAGES_BRANCH;
  if (cfPages && cfBranch) return cfBranch === 'main';
  return true;
}

const allowSearchCrawlers = (process.env.ALLOW_SEARCH_CRAWLERS ?? 'true') !== 'false';
const allowTrainingCrawlers = (process.env.ALLOW_TRAINING_CRAWLERS ?? 'false') === 'true';

function buildRobotsTxt() {
  if (!isProductionBuild()) {
    return [
      '# KonutArsa — PREVIEW BUILD',
      '# Bu, production dışı bir derlemedir; arama motorlarının bu sürümü',
      '# indexlememesi için tüm botlar engellenir (bkz. proje gereksinimleri madde 34).',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }

  const lines = [
    '# KonutArsa robots.txt',
    '# Otomatik üretilir: scripts/generate-robots.mjs — elle düzenlemeyin.',
    '',
    'User-agent: *',
    allowSearchCrawlers ? 'Allow: /' : 'Disallow: /',
    '',
    '# OAI-SearchBot: arama sonuçlarında görünmek için kullanılan bot, genel',
    '# arama botlarıyla aynı tercihi paylaşır (ALLOW_SEARCH_CRAWLERS).',
    'User-agent: OAI-SearchBot',
    allowSearchCrawlers ? 'Allow: /' : 'Disallow: /',
    '',
    '# GPTBot: yapay zekâ modeli eğitimi için içerik toplayan bot, arama',
    '# botlarından bağımsız olarak yönetilir (ALLOW_TRAINING_CRAWLERS).',
    'User-agent: GPTBot',
    allowTrainingCrawlers ? 'Allow: /' : 'Disallow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap-index.xml`,
    '',
  ];
  return lines.join('\n');
}

mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, buildRobotsTxt());
console.log(`✅ robots.txt üretildi: ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`);
console.log(`   Ortam: ${isProductionBuild() ? 'production' : 'preview'}`);
console.log(
  `   Arama botları: ${allowSearchCrawlers ? 'izinli' : 'engelli'} | Eğitim botları (GPTBot): ${allowTrainingCrawlers ? 'izinli' : 'engelli'}`
);
