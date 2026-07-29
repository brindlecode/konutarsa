/**
 * Turkish-aware slug and casing helpers.
 *
 * Imported directly by both Astro/TypeScript app code (via Vite) and plain
 * Node scripts (via Node's built-in TypeScript type-stripping, available
 * unflagged since Node 22.18+ — see .nvmrc). Keep this file free of Astro
 * virtual-module imports (e.g. `astro:content`) and of TS features type
 * stripping cannot erase (enums, namespaces, parameter properties) so it
 * stays importable from plain `node scripts/*.mjs` runs.
 */

const DIACRITIC_FOLD_MAP: Record<string, string> = {
  ı: 'i',
  ğ: 'g',
  ü: 'u',
  ş: 's',
  ö: 'o',
  ç: 'c',
  â: 'a',
  î: 'i',
  û: 'u',
  ê: 'e',
  ô: 'o',
};

const TURKISH_LETTER_TEST = /[a-zA-ZçğıİöşüÇĞIÖŞÜâîûêôÂÎÛÊÔ]/;

function foldTurkishDiacritics(lower: string): string {
  return lower.replace(/[ığüşöçâîûêô]/g, (ch) => DIACRITIC_FOLD_MAP[ch] ?? ch);
}

/**
 * Converts arbitrary Turkish text (any case) into a lowercase, ASCII-only,
 * hyphen-separated URL slug: "İstanbul" → "istanbul", "Iğdır" → "igdir",
 * "Bahçeşehir 1. Kısım" → "bahcesehir-1-kisim".
 */
export function slugify(value: string): string {
  const lowered = value.toLocaleLowerCase('tr-TR');
  const folded = foldTurkishDiacritics(lowered);
  return folded
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Trims outer whitespace and collapses internal whitespace runs to a single
 * space. Fixes source-file artifacts (trailing spaces, double spaces)
 * without altering letters, casing, or punctuation — the meaningful parts
 * of an original name are never touched.
 */
export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Converts an ALL-CAPS (or any-case) Turkish name into proper title case,
 * word by word, using tr-TR locale-aware case folding so "İ"/"I" resolve
 * correctly: "ÇANAKKALE" → "Çanakkale", "BAHÇEŞEHİR 2. KISIM" → "Bahçeşehir 2. Kısım".
 * Tokens with no letters (numbers, punctuation) pass through unchanged.
 */
export function toTurkishTitleCase(value: string): string {
  return value
    .split(/(\s+|-)/)
    .map((token) => {
      if (token.length === 0 || /^(\s+|-)$/.test(token)) return token;
      const lowered = token.toLocaleLowerCase('tr-TR');
      if (!TURKISH_LETTER_TEST.test(lowered)) return lowered;
      return lowered.charAt(0).toLocaleUpperCase('tr-TR') + lowered.slice(1);
    })
    .join('');
}

/**
 * Appends -2, -3, ... to a candidate slug until it is unique within `seen`,
 * then records the chosen slug in `seen`. Used for content slugs derived
 * from titles rather than explicitly set by an editor.
 */
export function ensureUniqueSlug(candidate: string, seen: Set<string>): string {
  if (!seen.has(candidate)) {
    seen.add(candidate);
    return candidate;
  }
  let attempt = 2;
  while (seen.has(`${candidate}-${attempt}`)) attempt += 1;
  const unique = `${candidate}-${attempt}`;
  seen.add(unique);
  return unique;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True for a well-formed slug: lowercase ASCII, no leading/trailing/double hyphens. */
export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}
