const WORDS_PER_MINUTE = 200;

/**
 * Strips common Markdown syntax so word counts approximate what a reader
 * actually reads, not source-file punctuation. Deliberately simple (regex
 * based, not a full parser) — good enough for reading-time estimates and
 * the soft word-count warnings in scripts/validate-content.mjs.
 */
export function stripMarkdownSyntax(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[source:[a-z0-9-]+\]\]/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(markdown: string): number {
  const plain = stripMarkdownSyntax(markdown);
  if (plain.length === 0) return 0;
  return plain.split(' ').filter(Boolean).length;
}

/** Rounded up to the nearest minute, minimum 1. */
export function estimateReadingTimeMinutes(markdown: string): number {
  const words = countWords(markdown);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
