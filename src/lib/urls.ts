export const SITE_URL = (import.meta.env.PUBLIC_SITE_URL || 'https://konutarsa.com').replace(
  /\/+$/,
  ''
);

export const CONTENT_COLLECTION_PATHS: Record<string, string> = {
  'konut-rehberi': '/konut-rehberi',
  'arsa-rehberi': '/arsa-rehberi',
  'bolge-analizleri': '/bolge-analizleri',
  mevzuat: '/mevzuat',
  'piyasa-raporlari': '/piyasa-raporlari',
  guncel: '/guncel',
  sozluk: '/sozluk',
};

/** Ensures a path starts and ends with "/", matching the site's trailingSlash: 'always' policy. */
export function normalizePath(pathname: string): string {
  const withLeading = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export function absoluteUrl(pathname: string): string {
  return `${SITE_URL}${normalizePath(pathname)}`;
}

/** URL for a plain (non-location) content collection entry. */
export function getContentPath(collection: string, slug: string): string {
  const prefix = CONTENT_COLLECTION_PATHS[collection];
  if (!prefix) throw new Error(`Bilinmeyen koleksiyon: ${collection}`);
  return normalizePath(`${prefix}/${slug}`);
}

/** URL for a bölge analizi entry: /bolge-analizleri/{il}/{ilçe}/{slug}/ */
export function getBolgeAnaliziPath(locationUrlPath: string, slug: string): string {
  return normalizePath(`/bolge-analizleri/${locationUrlPath}/${slug}`);
}

export function getAuthorPath(authorSlug: string): string {
  return normalizePath(`/yazarlar/${authorSlug}`);
}

export function getTagPath(tagSlug: string): string {
  return normalizePath(`/etiket/${tagSlug}`);
}
