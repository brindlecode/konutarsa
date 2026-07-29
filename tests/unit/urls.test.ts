import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  absoluteUrl,
  getContentPath,
  getBolgeAnaliziPath,
  getAuthorPath,
  getTagPath,
  SITE_URL,
} from '../../src/lib/urls';

describe('SITE_URL', () => {
  it('has no trailing slash', () => {
    expect(SITE_URL.endsWith('/')).toBe(false);
  });
});

describe('normalizePath', () => {
  it('adds a leading slash if missing', () => {
    expect(normalizePath('konut-rehberi')).toBe('/konut-rehberi/');
  });
  it('adds a trailing slash if missing', () => {
    expect(normalizePath('/konut-rehberi')).toBe('/konut-rehberi/');
  });
  it('leaves an already-correct path unchanged', () => {
    expect(normalizePath('/konut-rehberi/')).toBe('/konut-rehberi/');
  });
  it('handles the root path', () => {
    expect(normalizePath('/')).toBe('/');
  });
});

describe('absoluteUrl', () => {
  it('prefixes the site URL and normalizes the path', () => {
    expect(absoluteUrl('/hakkimizda')).toBe(`${SITE_URL}/hakkimizda/`);
  });
});

describe('getContentPath', () => {
  it('builds a URL for a plain collection', () => {
    expect(getContentPath('konut-rehberi', 'kat-mulkiyeti-nedir')).toBe(
      '/konut-rehberi/kat-mulkiyeti-nedir/'
    );
  });
  it('throws for an unknown collection', () => {
    expect(() => getContentPath('unknown-collection', 'slug')).toThrow();
  });
});

describe('getBolgeAnaliziPath', () => {
  it('builds a location-scoped URL without Turkish characters', () => {
    const path = getBolgeAnaliziPath('canakkale/merkez', 'kepezde-ev-alinir-mi');
    expect(path).toBe('/bolge-analizleri/canakkale/merkez/kepezde-ev-alinir-mi/');
    expect(path).toMatch(/^[a-z0-9/-]+$/);
  });
});

describe('getAuthorPath / getTagPath', () => {
  it('builds author and tag paths', () => {
    expect(getAuthorPath('gamze-kaya')).toBe('/yazarlar/gamze-kaya/');
    expect(getTagPath('hisseli-tapu')).toBe('/etiket/hisseli-tapu/');
  });
});
