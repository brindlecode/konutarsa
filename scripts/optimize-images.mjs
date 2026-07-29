#!/usr/bin/env node
/**
 * KonutArsa — build-time görsel optimizasyonu.
 *
 * public/uploads/images/ altındaki kaynak görselleri okur, EXIF yönünü
 * düzeltir, gereksiz metadata'yı temizler (sharp varsayılanı zaten bunu
 * yapar) ve public/generated/images/ altına 480/800/1200 piksel genişliğinde
 * WebP varyantları üretir. Değişmeyen görseller için (sha256 karşılaştırması)
 * yeniden işlem yapmaz. Üretilen manifest src/data/images-manifest.json
 * dosyasına yazılır (bu dosya .gitignore içindedir, her build'de yeniden
 * üretilir — bkz. src/lib/images.ts).
 *
 * Kullanım: node scripts/optimize-images.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(PROJECT_ROOT, 'public', 'uploads', 'images');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'generated', 'images');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'images-manifest.json');

const TARGET_WIDTHS = [480, 800, 1200];
const WEBP_QUALITY = 82;
const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function walkImageFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkImageFiles(fullPath));
    } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

function loadExistingManifest() {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function hashFile(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function processImage(filePath, manifestKey, baseName) {
  const buffer = readFileSync(filePath);
  const metadata = await sharp(buffer).rotate().metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;

  if (sourceWidth === 0 || sourceHeight === 0) {
    console.warn(`⚠️  UYARI: ${manifestKey} için boyut okunamadı, atlanıyor.`);
    return null;
  }

  const widthsToGenerate = TARGET_WIDTHS.filter((w) => w <= sourceWidth);
  if (widthsToGenerate.length === 0) widthsToGenerate.push(sourceWidth);

  const variants = [];
  for (const width of widthsToGenerate) {
    const outputFileName = `${baseName}-${width}.webp`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    await sharp(buffer)
      .rotate() // EXIF yönünü uygular, ardından EXIF'i düşürür
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);
    variants.push({ width, path: `/generated/images/${outputFileName}` });
  }

  const scaledHeight = Math.round(
    (sourceHeight / sourceWidth) * (widthsToGenerate[widthsToGenerate.length - 1] ?? sourceWidth)
  );

  return {
    sourcePath: `/${manifestKey}`,
    width: widthsToGenerate[widthsToGenerate.length - 1] ?? sourceWidth,
    height: scaledHeight,
    variants,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });

  const sourceFiles = walkImageFiles(SOURCE_DIR);
  const existingManifest = loadExistingManifest();
  const newManifest = {};

  let processed = 0;
  let skipped = 0;

  for (const filePath of sourceFiles) {
    const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
    const manifestKey = path
      .relative(path.join(PROJECT_ROOT, 'public'), filePath)
      .replace(/\\/g, '/');
    const buffer = readFileSync(filePath);
    const hash = hashFile(buffer);
    const baseName = `${path.basename(filePath, path.extname(filePath))}-${hash.slice(0, 10)}`;

    const existing = existingManifest[manifestKey];
    if (existing && existing.sourceHash === hash) {
      newManifest[manifestKey] = existing;
      skipped += 1;
      continue;
    }

    const result = await processImage(filePath, manifestKey, baseName);
    if (result) {
      newManifest[manifestKey] = { ...result, sourceHash: hash };
      processed += 1;
      console.log(`✅ İşlendi: ${relativePath} (${result.variants.length} varyant)`);
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(newManifest, null, 2) + '\n');

  console.log(
    `\nGörsel optimizasyonu tamamlandı: ${processed} işlendi, ${skipped} değişmediği için atlandı.`
  );
  console.log(`Manifest: ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`);
}

main().catch((error) => {
  console.error('❌ HATA: Görsel optimizasyonu başarısız oldu.', error);
  process.exitCode = 1;
});
