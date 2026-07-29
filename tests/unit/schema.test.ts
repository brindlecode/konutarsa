import { describe, it, expect } from 'vitest';
import {
  buildOrganizationSchema,
  buildWebsiteSchema,
  buildBreadcrumbSchema,
  buildPersonSchema,
  buildArticleSchema,
  buildFaqSchema,
  buildPlaceSchema,
} from '../../src/lib/schema';
import { resolveLocationRef } from '../../src/lib/locations';
import { SITE_URL } from '../../src/lib/urls';

function isAbsoluteUrl(value: string): boolean {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
}

describe('buildOrganizationSchema / buildWebsiteSchema', () => {
  it('produce valid, JSON-serializable objects with absolute URLs', () => {
    const org = buildOrganizationSchema();
    expect(org['@type']).toBe('Organization');
    expect(isAbsoluteUrl(org.url)).toBe(true);
    expect(() => JSON.stringify(org)).not.toThrow();

    const site = buildWebsiteSchema();
    expect(site['@type']).toBe('WebSite');
    expect(site.name.length).toBeGreaterThan(0);
    expect(site.description.length).toBeGreaterThan(0);
  });
});

describe('buildBreadcrumbSchema', () => {
  it('numbers items starting at 1 and uses absolute URLs', () => {
    const schema = buildBreadcrumbSchema([
      { label: 'Ana Sayfa', path: '/' },
      { label: 'Konut Rehberi', path: '/konut-rehberi/' },
    ]);
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0]!.position).toBe(1);
    expect(schema.itemListElement[1]!.position).toBe(2);
    for (const item of schema.itemListElement) {
      expect(item.item.startsWith(SITE_URL)).toBe(true);
    }
  });
});

describe('buildPersonSchema', () => {
  it('omits optional fields that were not provided', () => {
    const schema = buildPersonSchema({ name: 'Test Yazar', slug: 'test-yazar' });
    expect(schema.name).toBe('Test Yazar');
    expect(schema).not.toHaveProperty('jobTitle');
    expect(schema).not.toHaveProperty('image');
  });

  it('includes optional fields when provided', () => {
    const schema = buildPersonSchema({
      name: 'Test Yazar',
      slug: 'test-yazar',
      role: 'Yazar',
      bio: 'Bio metni',
    });
    expect(schema.jobTitle).toBe('Yazar');
    expect(schema.description).toBe('Bio metni');
  });
});

describe('buildArticleSchema', () => {
  it('matches visible content fields and required Article properties', () => {
    const schema = buildArticleSchema({
      headline: 'Test Başlık',
      description: 'Test açıklama',
      path: '/konut-rehberi/test/',
      datePublished: new Date('2026-01-01T00:00:00Z'),
      author: { name: 'Gamze Kaya', slug: 'gamze-kaya' },
      section: 'Konut Rehberi',
      keywords: ['tapu', 'konut'],
    });
    expect(schema['@type']).toBe('Article');
    expect(schema.headline).toBe('Test Başlık');
    expect(schema.datePublished).toBe('2026-01-01T00:00:00.000Z');
    expect(schema.dateModified).toBe(schema.datePublished); // dateModified geri düşer publishedAt'e
    expect(schema.isAccessibleForFree).toBe(true);
    expect(schema.keywords).toBe('tapu, konut');
  });

  it('uses dateModified when provided instead of falling back', () => {
    const schema = buildArticleSchema({
      headline: 'x',
      description: 'x',
      path: '/x/',
      datePublished: new Date('2026-01-01T00:00:00Z'),
      dateModified: new Date('2026-02-01T00:00:00Z'),
      author: { name: 'x', slug: 'x' },
      section: 'x',
    });
    expect(schema.dateModified).toBe('2026-02-01T00:00:00.000Z');
  });
});

describe('buildFaqSchema', () => {
  it('returns null for an empty FAQ list (no fake FAQPage)', () => {
    expect(buildFaqSchema([])).toBeNull();
  });

  it('mirrors visible question/answer content exactly', () => {
    const schema = buildFaqSchema([{ question: 'Soru?', answer: 'Cevap.' }]);
    expect(schema?.['@type']).toBe('FAQPage');
    expect(schema!.mainEntity[0]!.name).toBe('Soru?');
    expect(schema!.mainEntity[0]!.acceptedAnswer.text).toBe('Cevap.');
  });
});

describe('buildPlaceSchema', () => {
  it('never fabricates coordinates and only includes known hierarchy', () => {
    const resolved = resolveLocationRef('district:canakkale/merkez');
    expect(resolved).not.toBeNull();
    const schema = buildPlaceSchema(resolved!);
    expect(schema).not.toHaveProperty('geo');
    expect(schema.name).toBe('Merkez');
    expect(schema.containedInPlace?.name).toBe('Çanakkale');
  });
});
