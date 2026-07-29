import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { remarkSourceRefs } from './src/lib/remark-source-refs.ts';
import { rehypeTaskListA11y } from './src/lib/rehype-task-list-a11y.ts';
import { getQualifyingTagSlugs, getNoindexContentPaths } from './src/lib/tag-sitemap-rules.mjs';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const SITE_URL = (
  env.PUBLIC_SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  'https://konutarsa.com'
).replace(/\/$/, '');

function resolveIsProduction() {
  const explicit = env.PUBLIC_BUILD_ENV || process.env.PUBLIC_BUILD_ENV;
  if (explicit === 'production') return true;
  if (explicit === 'preview' || explicit === 'development') return false;
  const cfPages = env.CF_PAGES || process.env.CF_PAGES;
  const cfBranch = env.CF_PAGES_BRANCH || process.env.CF_PAGES_BRANCH;
  if (cfPages && cfBranch) return cfBranch === 'main';
  return true;
}

const isProduction = resolveIsProduction();

// URL path prefixes that must never appear in sitemap.xml regardless of content
// state: internal tools, technical routes, the site search page, and the tag
// directory index (each individual qualifying tag page is still included below).
const ALWAYS_EXCLUDED_FROM_SITEMAP = ['/arama/', '/404/', '/404.html', '/etiket/'];

/** @type {(page: string) => boolean} */
function sitemapFilter(page) {
  if (!isProduction) return false;

  const url = new URL(page);
  const pathname = url.pathname;

  if (ALWAYS_EXCLUDED_FROM_SITEMAP.some((prefix) => pathname === prefix)) {
    return false;
  }

  const tagMatch = pathname.match(/^\/etiket\/([^/]+)\/?$/);
  if (tagMatch) {
    const qualifying = getQualifyingTagSlugs();
    return qualifying.has(tagMatch[1]);
  }

  if (getNoindexContentPaths().has(pathname)) {
    return false;
  }

  return true;
}

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
  },
  server: {
    port: 4321,
  },
  integrations: [
    sitemap({
      filter: sitemapFilter,
      i18n: {
        defaultLocale: 'tr',
        locales: { tr: 'tr-TR' },
      },
    }),
  ],
  markdown: {
    // Sätteri (Astro 7'nin varsayılan Rust tabanlı işlemcisi) yerine bilinçli
    // olarak klasik unified/remark hattı kullanılır: [[source:key]] atıf
    // sözdizimini işleyen özel remark eklentimiz (remarkSourceRefs) yalnızca
    // bu hatta çalışır.
    processor: unified({
      remarkPlugins: [remarkSourceRefs],
      rehypePlugins: [rehypeTaskListA11y],
    }),
  },
  vite: {
    define: {
      __IS_PRODUCTION_BUILD__: JSON.stringify(isProduction),
    },
    build: {
      // Konum bulucu, her il için ayrı bir JSON chunk'ı yalnızca seçildiğinde
      // indirir (bkz. src/pages/bolgeler/konum-bul.astro). Bu chunk'lar hiçbir
      // sayfanın kritik yükleme yoluna dahil değildir; büyük olmaları beklenen
      // ve zararsız bir durumdur, bu yüzden varsayılan uyarı eşiği yükseltilir.
      chunkSizeWarningLimit: 1200,
    },
  },
});
