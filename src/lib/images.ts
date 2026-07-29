/**
 * Build-time (server-only) okuyucu: scripts/optimize-images.mjs tarafından
 * üretilen src/data/images-manifest.json dosyasını okur. Bu dosya .gitignore
 * içindedir ve her build'de yeniden üretilir (bkz. optimize-images.mjs).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MANIFEST_PATH = fileURLToPath(new URL('../data/images-manifest.json', import.meta.url));

export interface ImageVariant {
  width: number;
  path: string;
}

export interface ImageManifestEntry {
  sourcePath: string;
  width: number;
  height: number;
  variants: ImageVariant[];
}

type Manifest = Record<string, ImageManifestEntry>;

let manifestCache: Manifest | null = null;

function getManifest(): Manifest {
  if (manifestCache) return manifestCache;
  if (!existsSync(MANIFEST_PATH)) {
    manifestCache = {};
    return manifestCache;
  }
  try {
    manifestCache = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  } catch {
    manifestCache = {};
  }
  return manifestCache;
}

function normalizeKey(coverImagePath: string): string {
  return coverImagePath.replace(/^\/+/, '');
}

/** Returns the processed variant data for a cover image path (e.g. "/uploads/images/foo.jpg"), if it was optimized. */
export function getImageData(coverImagePath: string): ImageManifestEntry | undefined {
  return getManifest()[normalizeKey(coverImagePath)];
}

export function buildSrcset(entry: ImageManifestEntry): string {
  return entry.variants.map((variant) => `${variant.path} ${variant.width}w`).join(', ');
}

/** Largest available variant — used as the plain `src` fallback and for `<meta og:image>`. */
export function getLargestVariant(entry: ImageManifestEntry): ImageVariant | undefined {
  return entry.variants.reduce<ImageVariant | undefined>((largest, current) => {
    if (!largest || current.width > largest.width) return current;
    return largest;
  }, undefined);
}
