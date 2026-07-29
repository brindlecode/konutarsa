import { describe, it, expect } from 'vitest';
import {
  slugify,
  normalizeDisplayName,
  toTurkishTitleCase,
  ensureUniqueSlug,
  isValidSlug,
} from '../../src/lib/slug';

describe('slugify', () => {
  it.each([
    ['İstanbul', 'istanbul'],
    ['Çanakkale', 'canakkale'],
    ['Şile', 'sile'],
    ['Güzelyalı', 'guzelyali'],
    ['Bahçeşehir 1. Kısım', 'bahcesehir-1-kisim'],
    ['Iğdır', 'igdir'],
  ])('slugifies "%s" to "%s"', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('collapses repeated separators and trims edges', () => {
    expect(slugify('  Merhaba   Dünya!!  ')).toBe('merhaba-dunya');
  });

  it('handles parentheses and mixed punctuation', () => {
    expect(slugify('Bahçeli (Aratol)')).toBe('bahceli-aratol');
  });

  it('is idempotent on already-ascii input', () => {
    expect(slugify('kat-mulkiyeti-nedir')).toBe('kat-mulkiyeti-nedir');
  });
});

describe('normalizeDisplayName', () => {
  it('trims outer whitespace', () => {
    expect(normalizeDisplayName('Veysiye ')).toBe('Veysiye');
  });

  it('collapses internal double spaces without altering letters', () => {
    expect(normalizeDisplayName('Geçitli  Cumhuriyet')).toBe('Geçitli Cumhuriyet');
  });
});

describe('toTurkishTitleCase', () => {
  it.each([
    ['İSTANBUL', 'İstanbul'],
    ['ÇANAKKALE', 'Çanakkale'],
    ['BAŞAKŞEHİR', 'Başakşehir'],
    ['BAHÇEŞEHİR 2. KISIM', 'Bahçeşehir 2. Kısım'],
    ['AFYONKARAHİSAR', 'Afyonkarahisar'],
    ['IĞDIR', 'Iğdır'],
  ])('title-cases "%s" to "%s"', (input, expected) => {
    expect(toTurkishTitleCase(input)).toBe(expected);
  });
});

describe('ensureUniqueSlug', () => {
  it('returns the candidate unchanged the first time', () => {
    const seen = new Set<string>();
    expect(ensureUniqueSlug('kat-mulkiyeti-nedir', seen)).toBe('kat-mulkiyeti-nedir');
  });

  it('appends -2, -3, ... on collisions in encounter order', () => {
    const seen = new Set<string>();
    expect(ensureUniqueSlug('ev-almak', seen)).toBe('ev-almak');
    expect(ensureUniqueSlug('ev-almak', seen)).toBe('ev-almak-2');
    expect(ensureUniqueSlug('ev-almak', seen)).toBe('ev-almak-3');
  });
});

describe('isValidSlug', () => {
  it.each([
    ['kat-mulkiyeti-nedir', true],
    ['a1-b2', true],
    ['-bad', false],
    ['bad-', false],
    ['bad--slug', false],
    ['Bad', false],
    ['bad_slug', false],
    ['', false],
  ])('isValidSlug("%s") === %s', (input, expected) => {
    expect(isValidSlug(input)).toBe(expected);
  });
});
