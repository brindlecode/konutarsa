#!/usr/bin/env node
/**
 * KonutArsa — Cloudflare Pages _headers üretimi (bkz. madde 29).
 *
 * CSP, AdSense/Analytics kapalıyken sıkı tutulur; yalnızca ilgili özellik
 * gerçekten etkinleştirildiğinde (env değişkenleri) gerekli resmî Google/
 * Cloudflare alan adları script-src/connect-src/img-src/frame-src'ye
 * eklenir. Gelişigüzel "script-src *" veya "unsafe-eval" KULLANILMAZ.
 *
 * style-src için 'unsafe-inline' bilinçli bir istisnadır: Astro, bileşen
 * bazlı stilleri derleme sırasında bazen sayfa içine <style> bloğu olarak
 * gömer (harici .css dosyası yerine). Bu, script enjeksiyonuna izin vermez;
 * yalnızca CSS enjeksiyonu içindir ve yaygın kabul edilen bir ödünleşimdir
 * (bkz. SECURITY_AND_PRIVACY_TR.md).
 *
 * Kullanım: node scripts/generate-headers.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public', '_headers');

const adsenseEnabled =
  process.env.PUBLIC_ADSENSE_ENABLED === 'true' && Boolean(process.env.PUBLIC_ADSENSE_CLIENT);
const gaEnabled =
  process.env.PUBLIC_GA_ENABLED === 'true' && Boolean(process.env.PUBLIC_GA_MEASUREMENT_ID);
const cfAnalyticsEnabled = Boolean(process.env.PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN);

function buildCsp() {
  const scriptSrc = new Set(["'self'"]);
  const connectSrc = new Set(["'self'"]);
  const imgSrc = new Set(["'self'", 'data:']);
  const frameSrc = new Set(["'none'"]);

  if (adsenseEnabled) {
    scriptSrc.add('https://pagead2.googlesyndication.com');
    scriptSrc.add('https://*.googlesyndication.com');
    scriptSrc.add('https://www.googletagservices.com');
    connectSrc.add('https://*.googlesyndication.com');
    imgSrc.add('https://*.googlesyndication.com');
    imgSrc.add('https://*.doubleclick.net');
    frameSrc.delete("'none'");
    frameSrc.add('https://googleads.g.doubleclick.net');
    frameSrc.add('https://*.safeframe.googlesyndication.com');
  }

  if (gaEnabled) {
    scriptSrc.add('https://www.googletagmanager.com');
    connectSrc.add('https://www.google-analytics.com');
    connectSrc.add('https://*.analytics.google.com');
    connectSrc.add('https://www.googletagmanager.com');
    imgSrc.add('https://www.google-analytics.com');
  }

  if (cfAnalyticsEnabled) {
    scriptSrc.add('https://static.cloudflareinsights.com');
    connectSrc.add('https://cloudflareinsights.com');
  }

  if (frameSrc.size === 0) frameSrc.add("'none'");

  const directives = [
    `default-src 'self'`,
    `script-src ${[...scriptSrc].join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${[...imgSrc].join(' ')}`,
    `font-src 'self'`,
    `connect-src ${[...connectSrc].join(' ')}`,
    `frame-src ${[...frameSrc].join(' ')}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ];
  return directives.join('; ');
}

function buildHeadersFile() {
  const csp = buildCsp();
  return [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()',
    '  X-Frame-Options: DENY',
    '  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
    `  Content-Security-Policy: ${csp}`,
    '',
    '/generated/images/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/_astro/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n');
}

mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, buildHeadersFile());

console.log(`✅ _headers üretildi: ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`);
console.log(`   AdSense: ${adsenseEnabled ? 'etkin (CSP genişletildi)' : 'kapalı'}`);
console.log(`   GA4: ${gaEnabled ? 'etkin (CSP genişletildi)' : 'kapalı'}`);
console.log(
  `   Cloudflare Analytics: ${cfAnalyticsEnabled ? 'etkin (CSP genişletildi)' : 'kapalı'}`
);
