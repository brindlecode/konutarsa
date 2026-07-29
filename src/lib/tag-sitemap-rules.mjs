// Plain, synchronous helpers used only from astro.config.mjs (outside the Astro/Vite
// content-layer context, so they cannot use `astro:content`). They scan raw markdown
// frontmatter directly to compute two sitemap-exclusion sets:
//
// 1. Which `/etiket/{slug}/` archive pages currently have >= 3 published entries —
//    those are the only tag pages allowed into the sitemap. Thin tag pages still
//    render (readers can reach them via article tag chips) but stay out of
//    sitemap.xml and are marked noindex by the page itself.
// 2. Which individual content URLs have an editor-set `seo.noindex: true` override —
//    those must not appear in the sitemap either, even though the page itself
//    still builds normally.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import matter from 'gray-matter';
import { resolveLocationRef } from './locations.ts';
import { slugify } from './slug.ts';

const CONTENT_ROOT = new URL('../content/', import.meta.url).pathname;
const MIN_PUBLISHED_FOR_INDEXABLE_TAG = 3;

const COLLECTION_URL_PREFIXES = {
  'konut-rehberi': '/konut-rehberi',
  'arsa-rehberi': '/arsa-rehberi',
  mevzuat: '/mevzuat',
  'piyasa-raporlari': '/piyasa-raporlari',
  guncel: '/guncel',
  sozluk: '/sozluk',
};

function toAsciiSlug(value) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .replace(/ê/g, 'e')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function walkMarkdownFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function collectionOf(filePath) {
  const relative = filePath.slice(CONTENT_ROOT.length);
  return relative.split('/')[0];
}

let cachedExclusions = null;

/**
 * Scans all content once and returns:
 * - qualifyingTagSlugs: Set<string> of tag slugs with >= 3 published entries
 * - noindexPaths: Set<string> of full URL paths (with trailing slash) that a
 *   published entry explicitly marked `seo.noindex: true`
 */
function computeSitemapExclusions() {
  const tagCounts = new Map();
  const noindexPaths = new Set();

  for (const filePath of walkMarkdownFiles(CONTENT_ROOT)) {
    if (!statSync(filePath).isFile()) continue;
    let parsed;
    try {
      parsed = matter(readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }
    const data = parsed.data ?? {};
    if (data.status !== 'published') continue;

    const tags = Array.isArray(data.tags) ? data.tags : [];
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) continue;
      const slug = toAsciiSlug(tag);
      tagCounts.set(slug, (tagCounts.get(slug) ?? 0) + 1);
    }

    if (data.seo?.noindex) {
      const collection = collectionOf(filePath);
      const slug = data.slug ?? slugify(basename(filePath, '.md'));
      if (collection === 'bolge-analizleri') {
        const resolved = data.locationRef ? resolveLocationRef(data.locationRef) : null;
        if (resolved) noindexPaths.add(`/bolge-analizleri/${resolved.urlPath}/${slug}/`);
      } else if (COLLECTION_URL_PREFIXES[collection]) {
        noindexPaths.add(`${COLLECTION_URL_PREFIXES[collection]}/${slug}/`);
      }
    }
  }

  const qualifyingTagSlugs = new Set(
    [...tagCounts.entries()]
      .filter(([, count]) => count >= MIN_PUBLISHED_FOR_INDEXABLE_TAG)
      .map(([slug]) => slug)
  );

  return { qualifyingTagSlugs, noindexPaths };
}

function getExclusions() {
  if (!cachedExclusions) cachedExclusions = computeSitemapExclusions();
  return cachedExclusions;
}

export function getQualifyingTagSlugs() {
  return getExclusions().qualifyingTagSlugs;
}

export function getNoindexContentPaths() {
  return getExclusions().noindexPaths;
}

export { MIN_PUBLISHED_FOR_INDEXABLE_TAG, toAsciiSlug as slugifyTagForSitemap };
