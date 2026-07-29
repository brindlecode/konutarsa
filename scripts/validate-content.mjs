#!/usr/bin/env node
/**
 * KonutArsa — içerik kalite kontrolü (bkz. proje gereksinimleri madde 30).
 *
 * content.config.ts içindeki zod şeması, Astro her içerik koleksiyonuna
 * dokunduğunda (dev/build/check) aynı kuralların çoğunu zaten uygular. Bu
 * script ONA EK OLARAK, daha hızlı (Astro'yu hiç başlatmadan) bir ön-kontrol
 * sağlar ve zod'un TEK BAŞINA KOLAYCA YAPAMADIĞI kontrolleri de üstlenir:
 * koleksiyon içi yinelenen slug/title/canonical, gerçek görsel boyutları,
 * gövde içinde H2 varlığı, kelime sayısı ve satır içi kaynak atfı kullanımı.
 *
 * Kullanım: node scripts/validate-content.mjs
 * Çıkış kodu: hata varsa 1, yalnızca uyarı varsa/hiç sorun yoksa 0.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import sharp from 'sharp';
import { resolveLocationRef } from '../src/lib/locations.ts';
import { slugify, isValidSlug, normalizeDisplayName } from '../src/lib/slug.ts';
import { countWords, stripMarkdownSyntax } from '../src/lib/reading-time.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTENT_ROOT = path.join(PROJECT_ROOT, 'src', 'content');
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public');

const REQUIRES_QUICK_ANSWER = new Set(['konut-rehberi', 'arsa-rehberi', 'bolge-analizleri']);
const REQUIRES_METHODOLOGY = new Set(['bolge-analizleri', 'piyasa-raporlari']);
const RECOMMENDS_TWO_SOURCES = new Set([
  'konut-rehberi',
  'arsa-rehberi',
  'mevzuat',
  'piyasa-raporlari',
  'bolge-analizleri',
]);

const MIN_WORD_COUNTS = {
  'konut-rehberi': 800,
  'arsa-rehberi': 800,
  'bolge-analizleri': 1000,
  mevzuat: 700,
  'piyasa-raporlari': 900,
  guncel: 400,
  sozluk: 400,
};

const COLLECTION_URL_PREFIXES = {
  'konut-rehberi': '/konut-rehberi',
  'arsa-rehberi': '/arsa-rehberi',
  mevzuat: '/mevzuat',
  'piyasa-raporlari': '/piyasa-raporlari',
  guncel: '/guncel',
  sozluk: '/sozluk',
};

const errors = [];
const warnings = [];

function reportError(file, message) {
  errors.push({ file, message });
}
function reportWarning(file, message) {
  warnings.push({ file, message });
}

function relativePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath);
}

function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(dir, entry.name));
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function getImageDimensions(coverImagePath) {
  const localPath = path.join(PUBLIC_ROOT, coverImagePath.replace(/^\/+/, ''));
  if (!existsSync(localPath)) return null;
  try {
    const metadata = await sharp(localPath).metadata();
    return {
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      sizeBytes: readFileSync(localPath).byteLength,
    };
  } catch {
    return null;
  }
}

function extractInlineSourceKeys(body) {
  const matches = [...body.matchAll(/\[\[source:([a-z0-9][a-z0-9-]*)\]\]/g)];
  return matches.map((m) => m[1]);
}

function countH2(body) {
  return (body.match(/^##\s+.+$/gm) ?? []).length;
}

async function validateCollection(collectionName) {
  const dir = path.join(CONTENT_ROOT, collectionName);
  const files = listMarkdownFiles(dir);

  const seenSlugs = new Map();
  const seenTitles = new Map();
  const seenExcerpts = new Map();
  const seenCanonicals = new Map();

  for (const filePath of files) {
    const rel = relativePath(filePath);
    const raw = readFileSync(filePath, 'utf8');
    let parsed;
    try {
      parsed = matter(raw);
    } catch (error) {
      reportError(rel, `Frontmatter (YAML) ayrıştırılamadı: ${error.message}`);
      continue;
    }
    const data = parsed.data ?? {};
    const body = parsed.content ?? '';
    const isPublished = data.status === 'published';

    const slug = data.slug ?? slugify(path.basename(filePath, '.md'));

    // --- Yapısal kontroller (yalnızca published için hata) ---
    if (!data.title || String(data.title).trim().length === 0) {
      reportError(rel, 'Başlık (title) yok.');
    } else {
      if (isPublished && (data.title.length < 15 || data.title.length > 100)) {
        reportWarning(rel, `Başlık ${data.title.length} karakter (önerilen: 15-100).`);
      }
    }

    if (data.slug !== undefined && !isValidSlug(data.slug)) {
      reportError(
        rel,
        `Geçersiz slug: "${data.slug}". Yalnızca küçük harf, rakam ve tire kullanılmalı.`
      );
    }

    if (isPublished) {
      if (seenSlugs.has(slug)) {
        reportError(
          rel,
          `Yinelenen slug: "${slug}" (aynı zamanda ${seenSlugs.get(slug)} dosyasında kullanılıyor).`
        );
      } else {
        seenSlugs.set(slug, rel);
      }

      if (data.title) {
        const titleKey = data.title.trim().toLocaleLowerCase('tr-TR');
        if (seenTitles.has(titleKey)) {
          reportError(
            rel,
            `Yinelenen başlık: "${data.title}" (${seenTitles.get(titleKey)} ile aynı).`
          );
        } else {
          seenTitles.set(titleKey, rel);
        }
      }

      if (data.excerpt) {
        const excerptKey = data.excerpt.trim().toLocaleLowerCase('tr-TR');
        if (seenExcerpts.has(excerptKey)) {
          reportWarning(rel, `Yinelenen excerpt (${seenExcerpts.get(excerptKey)} ile aynı).`);
        } else {
          seenExcerpts.set(excerptKey, rel);
        }
      }

      const canonicalOverride = data.seo?.canonicalOverride;
      const canonicalKey =
        canonicalOverride ?? `${COLLECTION_URL_PREFIXES[collectionName] ?? collectionName}/${slug}`;
      if (seenCanonicals.has(canonicalKey)) {
        reportError(
          rel,
          `Yinelenen canonical: "${canonicalKey}" (${seenCanonicals.get(canonicalKey)} ile çakışıyor).`
        );
      } else {
        seenCanonicals.set(canonicalKey, rel);
      }
    }

    if (!data.excerpt) {
      if (isPublished) reportError(rel, 'Kısa özet (excerpt) yok.');
    } else if (data.excerpt.length < 100 && isPublished) {
      reportWarning(rel, `Excerpt ${data.excerpt.length} karakter (önerilen: 100-240).`);
    }

    if (!data.author) {
      reportError(rel, 'Yazar (author) yok.');
    }

    if (!data.publishedAt) {
      if (isPublished) reportError(rel, 'Yayın tarihi (publishedAt) yok.');
    } else {
      const publishedDate = new Date(data.publishedAt);
      if (isPublished && publishedDate.getTime() > Date.now()) {
        reportError(
          rel,
          `Yayın tarihi gelecekte: ${data.publishedAt}. Yayımlanan içerikte gelecek tarih olamaz.`
        );
      }
      if (data.updatedAt) {
        const updatedDate = new Date(data.updatedAt);
        if (updatedDate.getTime() < publishedDate.getTime()) {
          reportError(
            rel,
            'Güncelleme tarihi (updatedAt), yayın tarihinden (publishedAt) önce olamaz.'
          );
        }
      }
    }

    if (!data.coverImage) {
      if (isPublished) reportError(rel, 'Kapak görseli (coverImage) yok.');
    } else {
      if (!data.coverAlt) {
        reportError(rel, 'Kapak görseli alt metni (coverAlt) yok.');
      } else {
        const fileBaseName = path.basename(data.coverImage, path.extname(data.coverImage));
        if (
          data.coverAlt.trim().toLocaleLowerCase('tr-TR') ===
          fileBaseName.toLocaleLowerCase('tr-TR')
        ) {
          reportWarning(
            rel,
            'Alt metin, dosya adıyla aynı görünüyor — açıklayıcı bir alt metin yazın.'
          );
        }
      }
      const dimensions = await getImageDimensions(data.coverImage);
      if (!dimensions) {
        reportError(rel, `Kapak görseli bulunamadı: ${data.coverImage}`);
      } else {
        if (dimensions.width < 1200) {
          reportWarning(
            rel,
            `Kapak görseli ${dimensions.width}px genişliğinde (önerilen: >= 1200px).`
          );
        }
        if (dimensions.sizeBytes > 5 * 1024 * 1024) {
          reportWarning(
            rel,
            `Kapak görseli 5MB'tan büyük (${(dimensions.sizeBytes / 1024 / 1024).toFixed(1)}MB).`
          );
        }
      }
    }

    if (!data.coverAlt && !data.coverImage) {
      // already reported above via coverImage branch when coverImage exists;
      // when coverImage is entirely missing we don't double-report coverAlt.
    }

    // --- Kaynaklar ---
    const sources = Array.isArray(data.sources) ? data.sources : [];
    const declaredKeys = new Set(sources.map((s) => s.key));
    for (const source of sources) {
      if (!source.url || !isHttpUrl(source.url)) {
        reportError(rel, `Geçersiz kaynak URL'si: "${source.url}" (kaynak: ${source.key ?? '?'}).`);
      }
    }
    if (isPublished && RECOMMENDS_TWO_SOURCES.has(collectionName) && sources.length < 2) {
      reportWarning(rel, `Yalnızca ${sources.length} kaynak var (önerilen: en az 2).`);
    }

    const inlineKeys = extractInlineSourceKeys(body);
    for (const key of inlineKeys) {
      if (!declaredKeys.has(key)) {
        reportError(
          rel,
          `Satır içi [[source:${key}]] referansı, "sources" listesinde tanımlı değil.`
        );
      }
    }
    if (isPublished && inlineKeys.length === 0 && sources.length > 0) {
      reportWarning(
        rel,
        'Kaynaklar tanımlı ama gövdede hiç [[source:...]] satır içi ataması kullanılmamış.'
      );
    }

    // --- Koleksiyona özgü zorunluluklar ---
    if (REQUIRES_QUICK_ANSWER.has(collectionName) && isPublished && !data.quickAnswer) {
      reportError(
        rel,
        'Bu koleksiyonda yayımlanan içerikte "quickAnswer" (doğrudan cevap) zorunludur.'
      );
    }
    if (data.quickAnswer) {
      const wordCount = countWords(data.quickAnswer);
      if (wordCount < 30 || wordCount > 150) {
        reportWarning(rel, `Doğrudan cevap ${wordCount} kelime (önerilen: 40-120).`);
      }
    }

    if (REQUIRES_METHODOLOGY.has(collectionName) && isPublished && !data.methodology) {
      reportError(rel, 'Bu koleksiyonda yayımlanan içerikte "methodology" zorunludur.');
    }

    if (collectionName === 'bolge-analizleri') {
      if (!data.locationRef) {
        reportError(rel, 'Bölge analizinde "locationRef" yok.');
      } else if (!resolveLocationRef(data.locationRef)) {
        reportError(rel, `Geçersiz locationRef: "${data.locationRef}".`);
      }
      if (data.locationScope === 'custom-area' && !data.customLocationLabel) {
        reportError(rel, 'locationScope "custom-area" iken "customLocationLabel" zorunludur.');
      }
    }

    if (data.sponsorship?.sponsored) {
      if (!data.sponsorship.sponsorName) reportError(rel, 'Sponsorlu içerikte sponsor adı yok.');
      if (!data.sponsorship.disclosure)
        reportError(rel, 'Sponsorlu içerikte açıklama (disclosure) yok.');
    }

    // --- İçerik kalitesi (uyarı) ---
    const plainText = stripMarkdownSyntax(body);
    const wordCount = plainText.length === 0 ? 0 : plainText.split(' ').filter(Boolean).length;
    const minWords = MIN_WORD_COUNTS[collectionName];
    if (isPublished && minWords && wordCount < minWords) {
      reportWarning(rel, `İçerik ${wordCount} kelime (önerilen minimum: ${minWords}).`);
    }
    if (isPublished && countH2(body) === 0 && collectionName !== 'sozluk') {
      reportWarning(rel, 'Gövdede hiç H2 (##) başlığı bulunamadı.');
    }

    if (collectionName === 'sozluk') {
      if (!data.definition || data.definition.trim().length < 20) {
        reportError(rel, 'Sözlük maddesinde "definition" (tanım) yok veya çok kısa.');
      }
      if (isPublished && !data.whyItMatters) {
        reportError(rel, 'Yayımlanan sözlük maddesinde "whyItMatters" (neden önemli) zorunludur.');
      }
    }

    if (data.title && normalizeDisplayName(data.title) !== data.title) {
      reportWarning(rel, 'Başlıkta gereksiz boşluk (baş/son veya çift boşluk) var.');
    }
  }
}

async function main() {
  const collections = [
    'konut-rehberi',
    'arsa-rehberi',
    'bolge-analizleri',
    'mevzuat',
    'piyasa-raporlari',
    'guncel',
    'sozluk',
  ];

  console.log('=== KonutArsa — İçerik Kalite Kontrolü ===\n');

  for (const collection of collections) {
    await validateCollection(collection);
  }

  if (errors.length > 0) {
    console.error(`❌ ${errors.length} HATA bulundu:\n`);
    for (const { file, message } of errors) {
      console.error(`  [${file}] ${message}`);
    }
    console.error('');
  }

  if (warnings.length > 0) {
    console.warn(`⚠️  ${warnings.length} uyarı:\n`);
    for (const { file, message } of warnings) {
      console.warn(`  [${file}] ${message}`);
    }
    console.warn('');
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Hiçbir sorun bulunamadı.');
  }

  if (errors.length > 0) {
    console.error(`❌ İçerik doğrulaması BAŞARISIZ (${errors.length} hata). Build durduruldu.`);
    process.exit(1);
  }

  console.log(`✅ İçerik doğrulaması geçti (${warnings.length} uyarı ile).`);
}

main().catch((error) => {
  console.error('❌ HATA: İçerik doğrulama scripti beklenmedik şekilde başarısız oldu.', error);
  process.exit(1);
});
