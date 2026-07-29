const TIMEZONE = 'Europe/Istanbul';
const LOCALE = 'tr-TR';

/** "29 Temmuz 2026" */
export function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/** "29.07.2026" */
export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** ISO 8601 string for datetime attributes and JSON-LD (UTC instant, unaffected by display timezone). */
export function toIsoString(date: Date): string {
  return date.toISOString();
}

export function daysBetween(from: Date, to: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

export function isFutureDate(date: Date, now: Date = new Date()): boolean {
  return date.getTime() > now.getTime();
}
