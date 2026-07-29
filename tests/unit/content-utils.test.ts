import { describe, it, expect } from 'vitest';
import {
  getRelatedContent,
  getEntrySlug,
  assertPublished,
  type ContentSummary,
} from '../../src/lib/content-utils';

function buildSummary(overrides: Partial<ContentSummary>): ContentSummary {
  return {
    collection: 'konut-rehberi',
    slug: 'ornek',
    url: '/konut-rehberi/ornek/',
    title: 'Örnek',
    excerpt: 'Örnek özet',
    tags: [],
    publishedAt: new Date('2026-01-01'),
    authorSlug: 'gamze-kaya',
    ...overrides,
  };
}

describe('getEntrySlug', () => {
  it('uses the explicit slug when present', () => {
    expect(getEntrySlug({ id: 'dosya-adi', data: { slug: 'ozel-slug' } })).toBe('ozel-slug');
  });
  it('falls back to a re-slugified file id, Turkish-aware', () => {
    expect(getEntrySlug({ id: 'Çanakkale Rehberi', data: {} })).toBe('canakkale-rehberi');
  });
});

describe('assertPublished', () => {
  it('does not throw for a complete published entry', () => {
    expect(() =>
      assertPublished({
        status: 'published',
        publishedAt: new Date(),
        excerpt: 'x',
        coverImage: '/a.jpg',
        coverAlt: 'a',
      })
    ).not.toThrow();
  });

  it('throws when called on a draft', () => {
    expect(() => assertPublished({ status: 'draft' })).toThrow();
  });

  it('throws when a required field is missing despite published status', () => {
    expect(() => assertPublished({ status: 'published' })).toThrow();
  });
});

describe('getRelatedContent (bkz. madde 21 öncelik sırası)', () => {
  const target = buildSummary({
    slug: 'hedef',
    locationRef: 'district:canakkale/merkez',
    provinceSlug: 'canakkale',
    districtSlug: 'merkez',
    tags: ['imar', 'arsa'],
    publishedAt: new Date('2026-06-01'),
  });

  it('excludes the target itself from the pool', () => {
    const result = getRelatedContent(target, [target]);
    expect(result).toHaveLength(0);
  });

  it('ranks an exact location match above a same-province-only match', () => {
    const sameLocation = buildSummary({
      slug: 'ayni-konum',
      collection: 'bolge-analizleri',
      locationRef: 'district:canakkale/merkez',
      provinceSlug: 'canakkale',
      districtSlug: 'merkez',
      publishedAt: new Date('2020-01-01'),
    });
    const sameProvinceOnly = buildSummary({
      slug: 'ayni-il',
      collection: 'bolge-analizleri',
      locationRef: 'district:canakkale/baska-ilce',
      provinceSlug: 'canakkale',
      districtSlug: 'baska-ilce',
      publishedAt: new Date('2026-01-01'),
    });
    const result = getRelatedContent(target, [sameProvinceOnly, sameLocation]);
    expect(result[0]?.slug).toBe('ayni-konum');
  });

  it('gives weight to shared tags and same collection', () => {
    const sameCollectionAndTags = buildSummary({
      slug: 'ayni-koleksiyon',
      collection: 'konut-rehberi',
      tags: ['imar'],
      publishedAt: new Date('2026-01-01'),
    });
    const unrelated = buildSummary({
      slug: 'ilgisiz',
      collection: 'guncel',
      tags: ['baska-konu'],
      publishedAt: new Date('2026-06-15'),
    });
    const result = getRelatedContent(target, [unrelated, sameCollectionAndTags]);
    expect(result.map((r) => r.slug)).toContain('ayni-koleksiyon');
    expect(result.map((r) => r.slug)).not.toContain('ilgisiz');
  });

  it('uses publishedAt as a tie-breaker for equal scores', () => {
    const older = buildSummary({
      slug: 'eski',
      tags: ['imar'],
      publishedAt: new Date('2020-01-01'),
    });
    const newer = buildSummary({
      slug: 'yeni',
      tags: ['imar'],
      publishedAt: new Date('2026-01-01'),
    });
    const result = getRelatedContent(target, [older, newer]);
    expect(result[0]?.slug).toBe('yeni');
  });

  it('never returns more than 6 items', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      buildSummary({ slug: `item-${i}`, tags: ['imar'], publishedAt: new Date(2020 + i, 0, 1) })
    );
    expect(getRelatedContent(target, many).length).toBeLessThanOrEqual(6);
  });
});
