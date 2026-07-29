/**
 * Astro'nun `astro:content` sanal modülüne bağımlı OLMAYAN, saf yardımcı
 * fonksiyonlar ve tipler. Bu ayrım bilinçlidir: bu dosya hem content.ts
 * (Astro sayfaları için) hem de tests/unit/*.test.ts (Vitest, astro:content'i
 * çözemez) tarafından güvenle import edilebilir.
 */
import { slugify } from './slug';
import { countWords } from './reading-time';
import { getContentPath, getBolgeAnaliziPath } from './urls';

export type ContentCollectionName =
  | 'konut-rehberi'
  | 'arsa-rehberi'
  | 'bolge-analizleri'
  | 'mevzuat'
  | 'piyasa-raporlari'
  | 'guncel'
  | 'sozluk';

export const CONTENT_COLLECTIONS: ContentCollectionName[] = [
  'konut-rehberi',
  'arsa-rehberi',
  'bolge-analizleri',
  'mevzuat',
  'piyasa-raporlari',
  'guncel',
  'sozluk',
];

export const COLLECTION_LABELS_TR: Record<ContentCollectionName, string> = {
  'konut-rehberi': 'Konut Rehberi',
  'arsa-rehberi': 'Arsa Rehberi',
  'bolge-analizleri': 'Bölge Analizleri',
  mevzuat: 'Mevzuat',
  'piyasa-raporlari': 'Piyasa Raporları',
  guncel: 'Güncel',
  sozluk: 'Gayrimenkul Sözlüğü',
};

export interface ContentSummary {
  collection: ContentCollectionName;
  slug: string;
  url: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  coverAlt?: string;
  tags: string[];
  publishedAt: Date;
  updatedAt?: Date;
  locationRef?: string;
  provinceSlug?: string;
  districtSlug?: string;
  authorSlug: string;
  reviewerSlug?: string;
}

export interface AuthorSummary {
  slug: string;
  name: string;
  role?: string;
  bio?: string;
  avatar?: string;
  url: string;
}

/** Falls back to the file-name-derived id (re-slugified for safety) when no explicit `slug` is set. */
export function getEntrySlug(entry: { id: string; data: { slug?: string } }): string {
  return entry.data.slug ?? slugify(entry.id);
}

interface PublishableData {
  status: 'draft' | 'published';
  publishedAt?: Date;
  excerpt?: string;
  coverImage?: string;
  coverAlt?: string;
}

/**
 * Narrows a published entry's data so publishedAt/excerpt/coverImage/coverAlt
 * are known non-undefined — content.config.ts's superRefine guarantees this
 * for any entry that actually reached "published" status, so a failure here
 * means schema validation was bypassed and indicates a bug, not bad content.
 */
export function assertPublished<T extends PublishableData>(
  data: T
): asserts data is T & {
  publishedAt: Date;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
} {
  if (data.status !== 'published') {
    throw new Error(
      'assertPublished yalnızca status: "published" olan girdiler için çağrılmalıdır.'
    );
  }
  if (!data.publishedAt || !data.excerpt || !data.coverImage || !data.coverAlt) {
    throw new Error(
      'Yayımlanan içerikte zorunlu alan eksik bulundu. content.config.ts şema doğrulaması bunu engellemiş ' +
        'olmalıydı — lütfen bir hata bildirin.'
    );
  }
}

export function buildContentUrl<C extends ContentCollectionName>(
  collection: C,
  slug: string,
  locationUrlPath?: string
): string {
  if (collection === 'bolge-analizleri') {
    if (!locationUrlPath) throw new Error('bolge-analizleri için locationUrlPath zorunludur.');
    return getBolgeAnaliziPath(locationUrlPath, slug);
  }
  return getContentPath(collection, slug);
}

/**
 * İlgili içerik puanlama (bkz. proje gereksinimleri madde 21): aynı konum en
 * yüksek ağırlık, ardından ilçe / il, aynı içerik türü ve ortak etiketler.
 * Yayın tarihi yalnızca eşit puanlarda sıralama kriteri olarak kullanılır.
 */
export function scoreRelatedness(candidate: ContentSummary, target: ContentSummary): number {
  let score = 0;
  if (target.locationRef && candidate.locationRef === target.locationRef) {
    score += 100;
  } else if (target.districtSlug && candidate.districtSlug === target.districtSlug) {
    score += 70;
  } else if (target.provinceSlug && candidate.provinceSlug === target.provinceSlug) {
    score += 50;
  }
  if (candidate.collection === target.collection) score += 30;
  const sharedTagCount = candidate.tags.filter((tag) => target.tags.includes(tag)).length;
  score += sharedTagCount * 10;
  return score;
}

export function getRelatedContent(
  target: ContentSummary,
  pool: ContentSummary[],
  maxResults = 6
): ContentSummary[] {
  return pool
    .filter(
      (candidate) => !(candidate.collection === target.collection && candidate.slug === target.slug)
    )
    .map((candidate) => ({ item: candidate, score: scoreRelatedness(candidate, target) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) => b.score - a.score || b.item.publishedAt.getTime() - a.item.publishedAt.getTime()
    )
    .slice(0, Math.max(4, Math.min(6, maxResults)))
    .map(({ item }) => item);
}

export function getBodyWordCount(entry: { body?: string }): number {
  return countWords(entry.body ?? '');
}
