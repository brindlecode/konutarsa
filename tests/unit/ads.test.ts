import { describe, it, expect } from 'vitest';
import { isAdCurrentlyActive, matchesTargeting, type DirectAd } from '../../src/lib/ads';

function buildAd(overrides: Partial<DirectAd> = {}): DirectAd {
  return {
    id: 'test-ad',
    active: true,
    advertiser: 'Test Advertiser',
    label: 'Reklam',
    image: '/uploads/images/test.jpg',
    alt: 'test',
    destinationUrl: 'https://example.com',
    placement: 'article-bottom',
    startAt: '',
    endAt: '',
    targeting: { categories: [], provinces: [], districts: [] },
    ...overrides,
  };
}

describe('isAdCurrentlyActive', () => {
  const now = new Date('2026-07-29T12:00:00Z');

  it('is false when active flag is false', () => {
    expect(isAdCurrentlyActive(buildAd({ active: false }), now)).toBe(false);
  });

  it('is true with no date bounds set', () => {
    expect(isAdCurrentlyActive(buildAd(), now)).toBe(true);
  });

  it('is false before startAt', () => {
    expect(isAdCurrentlyActive(buildAd({ startAt: '2026-08-01T00:00:00Z' }), now)).toBe(false);
  });

  it('is false after endAt', () => {
    expect(isAdCurrentlyActive(buildAd({ endAt: '2026-07-01T00:00:00Z' }), now)).toBe(false);
  });

  it('is true within the start/end window', () => {
    const ad = buildAd({ startAt: '2026-07-01T00:00:00Z', endAt: '2026-08-01T00:00:00Z' });
    expect(isAdCurrentlyActive(ad, now)).toBe(true);
  });
});

describe('matchesTargeting', () => {
  it('does not match a different placement', () => {
    const ad = buildAd({ placement: 'article-bottom' });
    expect(matchesTargeting(ad, { placement: 'home' })).toBe(false);
  });

  it('matches any context when targeting arrays are empty (global)', () => {
    const ad = buildAd();
    expect(matchesTargeting(ad, { placement: 'article-bottom' })).toBe(true);
    expect(matchesTargeting(ad, { placement: 'article-bottom', provinceSlug: 'istanbul' })).toBe(
      true
    );
  });

  it('requires a category match when categories are specified', () => {
    const ad = buildAd({
      targeting: { categories: ['bolge-analizleri'], provinces: [], districts: [] },
    });
    expect(
      matchesTargeting(ad, { placement: 'article-bottom', category: 'bolge-analizleri' })
    ).toBe(true);
    expect(matchesTargeting(ad, { placement: 'article-bottom', category: 'mevzuat' })).toBe(false);
    expect(matchesTargeting(ad, { placement: 'article-bottom' })).toBe(false);
  });

  it('requires a province match when provinces are specified', () => {
    const ad = buildAd({ targeting: { categories: [], provinces: ['istanbul'], districts: [] } });
    expect(matchesTargeting(ad, { placement: 'article-bottom', provinceSlug: 'istanbul' })).toBe(
      true
    );
    expect(matchesTargeting(ad, { placement: 'article-bottom', provinceSlug: 'ankara' })).toBe(
      false
    );
  });
});
