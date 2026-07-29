import siteData from '../data/site.json';
import siteContentData from '../data/site-content.json';
import { absoluteUrl, normalizePath, SITE_URL } from './urls';

// site.json (teknik sabitler, mühendislik tarafından yönetilir) ve
// site-content.json (Gamze'nin Pages CMS üzerinden düzenleyebileceği tanıtım
// metinleri ve iletişim bilgileri) tek bir SITE nesnesinde birleştirilir —
// bkz. LOCATION_DATA_GUIDE_TR.md ve .pages.yml için 10.2 maddesindeki ayrım.
export const SITE = { ...siteData, ...siteContentData };

/** "{başlık} | KonutArsa" — ana sayfa için ayrı bir sabit kullanılır (bkz. BaseLayout). */
export function resolveTitle(titleOverride: string | undefined, fallbackTitle: string): string {
  const base = (titleOverride ?? fallbackTitle).trim();
  return `${base} | ${SITE.name}`;
}

const MAX_DESCRIPTION_LENGTH = 160;

/** Fallback zinciri: descriptionOverride → excerpt → quickAnswer (kısaltılmış) → site açıklaması. */
export function resolveDescription(input: {
  descriptionOverride?: string;
  excerpt?: string;
  quickAnswer?: string;
}): string {
  const candidate =
    input.descriptionOverride || input.excerpt || input.quickAnswer || SITE.description;
  if (candidate.length <= MAX_DESCRIPTION_LENGTH) return candidate;
  return `${candidate.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

/** Canonical override yoksa mutlak site URL'inden üretir; override varsa olduğu gibi kullanır (şema zaten https+domain doğrular). */
export function resolveCanonical(pathname: string, canonicalOverride?: string): string {
  if (canonicalOverride) return canonicalOverride;
  return absoluteUrl(pathname);
}

export function buildRobotsContent(options: { noindex?: boolean; nofollow?: boolean }): string {
  const indexPart = options.noindex ? 'noindex' : 'index';
  const followPart = options.nofollow ? 'nofollow' : 'follow';
  // Büyük görsel önizlemesine izin ver (bkz. madde 19.4) — indexlenmeyen
  // sayfalarda zararsız, indexlenenlerde Discover/görsel önizleme için faydalı.
  return `${indexPart},${followPart},max-image-preview:large`;
}

/**
 * Preview (Cloudflare Pages branch != production) derlemelerinde siteyi
 * tamamen indexlemeden çıkarır (bkz. madde 34). Production canonical/robots
 * mantığını bozmadan, tek bir noktadan geçersiz kılar.
 */
export function isPreviewBuild(): boolean {
  const explicit = import.meta.env.PUBLIC_BUILD_ENV;
  if (explicit === 'production') return false;
  if (explicit === 'preview' || explicit === 'development') return true;
  return !import.meta.env.PROD;
}

export interface PageRobotsOptions {
  noindex?: boolean;
  nofollow?: boolean;
}

/** Preview build'lerde her koşulda noindex,nofollow döner; production'da verilen değerleri kullanır. */
export function resolvePageRobots(options: PageRobotsOptions): string {
  if (isPreviewBuild()) return 'noindex,nofollow';
  return buildRobotsContent(options);
}

export function ogImageUrl(pathOrUrl: string | undefined, fallback: string): string {
  const value = pathOrUrl || fallback;
  if (/^https?:\/\//.test(value)) return value;
  return absoluteUrl(value);
}

export { SITE_URL, normalizePath };
