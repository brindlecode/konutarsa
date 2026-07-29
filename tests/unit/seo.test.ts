import { describe, it, expect } from 'vitest';
import {
  resolveTitle,
  resolveDescription,
  resolveCanonical,
  buildRobotsContent,
  SITE,
  SITE_URL,
} from '../../src/lib/seo';

describe('resolveTitle', () => {
  it('appends the site name to a plain title', () => {
    expect(resolveTitle(undefined, 'Kat Mülkiyeti Nedir')).toBe(
      `Kat Mülkiyeti Nedir | ${SITE.name}`
    );
  });
  it('prefers an explicit override over the fallback', () => {
    expect(resolveTitle('Özel Başlık', 'Yedek Başlık')).toBe(`Özel Başlık | ${SITE.name}`);
  });
});

describe('resolveDescription', () => {
  it('prefers descriptionOverride over excerpt and quickAnswer', () => {
    expect(
      resolveDescription({
        descriptionOverride: 'Öncelikli',
        excerpt: 'İkincil',
        quickAnswer: 'Üçüncül',
      })
    ).toBe('Öncelikli');
  });
  it('falls back to excerpt when no override is set', () => {
    expect(resolveDescription({ excerpt: 'Excerpt metni' })).toBe('Excerpt metni');
  });
  it('falls back to quickAnswer when neither override nor excerpt exist', () => {
    expect(resolveDescription({ quickAnswer: 'Hızlı cevap metni' })).toBe('Hızlı cevap metni');
  });
  it('falls back to the site description as a last resort (truncated to 160 chars like any other source)', () => {
    const result = resolveDescription({});
    expect(SITE.description.startsWith(result.replace(/…$/, ''))).toBe(true);
    expect(result.length).toBeLessThanOrEqual(160);
  });
  it('truncates descriptions longer than 160 characters', () => {
    const long = 'a'.repeat(200);
    const result = resolveDescription({ excerpt: long });
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith('…')).toBe(true);
  });
});

describe('resolveCanonical', () => {
  it('builds an absolute canonical from a path when no override is given', () => {
    expect(resolveCanonical('/konut-rehberi/kat-mulkiyeti-nedir/')).toBe(
      `${SITE_URL}/konut-rehberi/kat-mulkiyeti-nedir/`
    );
  });
  it('uses the override verbatim when provided', () => {
    const override = `${SITE_URL}/ozel-canonical/`;
    expect(resolveCanonical('/some-path/', override)).toBe(override);
  });
});

describe('buildRobotsContent', () => {
  it('defaults to index,follow with large image preview', () => {
    expect(buildRobotsContent({})).toBe('index,follow,max-image-preview:large');
  });
  it('respects noindex and nofollow flags', () => {
    expect(buildRobotsContent({ noindex: true, nofollow: true })).toBe(
      'noindex,nofollow,max-image-preview:large'
    );
  });
});
