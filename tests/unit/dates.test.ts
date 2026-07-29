import { describe, it, expect } from 'vitest';
import {
  formatDateLong,
  formatDateShort,
  toIsoString,
  daysBetween,
  isFutureDate,
} from '../../src/lib/dates';

describe('formatDateLong', () => {
  it('formats a date in Turkish long form', () => {
    const date = new Date('2026-07-29T12:00:00Z');
    expect(formatDateLong(date)).toBe('29 Temmuz 2026');
  });
});

describe('formatDateShort', () => {
  it('formats a date as DD.MM.YYYY', () => {
    const date = new Date('2026-07-29T12:00:00Z');
    expect(formatDateShort(date)).toBe('29.07.2026');
  });
});

describe('toIsoString', () => {
  it('returns a full ISO 8601 string', () => {
    const date = new Date('2026-07-29T12:00:00.000Z');
    expect(toIsoString(date)).toBe('2026-07-29T12:00:00.000Z');
  });
});

describe('daysBetween', () => {
  it('computes whole days between two dates', () => {
    const from = new Date('2026-07-01T00:00:00Z');
    const to = new Date('2026-07-11T00:00:00Z');
    expect(daysBetween(from, to)).toBe(10);
  });
});

describe('isFutureDate', () => {
  it('returns true for a date after "now"', () => {
    const now = new Date('2026-07-29T00:00:00Z');
    const future = new Date('2026-08-01T00:00:00Z');
    expect(isFutureDate(future, now)).toBe(true);
  });
  it('returns false for a date at or before "now"', () => {
    const now = new Date('2026-07-29T00:00:00Z');
    expect(isFutureDate(now, now)).toBe(false);
  });
});
