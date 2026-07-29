#!/usr/bin/env node
/**
 * KonutArsa — konum verisi aktarım scripti.
 *
 * data-source/Turkiye_Il_Ilce_Mahalle_Listesi_2026.xlsx dosyasını okur ve
 * src/data/locations/ altına il, ilçe, mahalle ve arama indeksi JSON
 * dosyalarını üretir. Bu script SAYFA ÜRETMEZ — yalnızca veri üretir.
 * 32.311 mahalle için ayrı HTML sayfası üretilmesi kesinlikle yasaktır
 * (bkz. proje gereksinimleri, madde 6.5 ve 47).
 *
 * Kullanım:
 *   node scripts/import-locations.mjs [xlsx-dosya-yolu]
 *
 * Varsayılan kaynak: data-source/Turkiye_Il_Ilce_Mahalle_Listesi_2026.xlsx
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import XLSX from 'xlsx';
import { slugify, normalizeDisplayName, toTurkishTitleCase } from '../src/lib/slug.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE_FILE = path.join(
  PROJECT_ROOT,
  'data-source',
  'Turkiye_Il_Ilce_Mahalle_Listesi_2026.xlsx'
);
const OUTPUT_ROOT = path.join(PROJECT_ROOT, 'src', 'data', 'locations');
const NEIGHBORHOODS_DIR = path.join(OUTPUT_ROOT, 'neighborhoods');

const EXPECTED = {
  provinces: 81,
  officialDistricts: 922,
  provinceCenters: 51,
  districtGroups: 973,
  neighborhoods: 32311,
};

const REQUIRED_SHEETS = ['Tum_Mahalleler', 'Ilceler', 'Iller', 'Ozet'];

let hadError = false;

function reportError(message) {
  hadError = true;
  console.error(`❌ HATA: ${message}`);
}

function reportWarning(message) {
  console.warn(`⚠️  UYARI: ${message}`);
}

function readSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
}

function padId(sourceOrder) {
  return `m-${String(sourceOrder).padStart(6, '0')}`;
}

function main() {
  const sourceFile = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SOURCE_FILE;

  console.log('=== KonutArsa — Konum Verisi Aktarımı ===');
  console.log(`Kaynak dosya: ${sourceFile}`);

  if (!existsSync(sourceFile)) {
    reportError(
      `Kaynak dosya bulunamadı: ${sourceFile}\n` +
        '   "Turkiye_Il_Ilce_Mahalle_Listesi_2026.xlsx" dosyasını data-source/ klasörüne yerleştirip tekrar deneyin.\n' +
        '   Bu dosya olmadan konum verisi üretilemez; mevcut src/data/locations/ içeriği (varsa) değiştirilmedi.'
    );
    process.exitCode = 1;
    return;
  }

  const fileBuffer = readFileSync(sourceFile);
  const sourceHash = createHash('sha256').update(fileBuffer).digest('hex').slice(0, 16);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });

  for (const sheetName of REQUIRED_SHEETS) {
    if (!workbook.SheetNames.includes(sheetName)) {
      reportError(
        `Kaynak dosyada beklenen sayfa yok: "${sheetName}". Bulunan sayfalar: ${workbook.SheetNames.join(', ')}`
      );
    }
  }
  if (hadError) {
    process.exitCode = 1;
    return;
  }

  const rawNeighborhoods = readSheetRows(workbook, 'Tum_Mahalleler');
  const rawDistricts = readSheetRows(workbook, 'Ilceler');
  const rawProvinces = readSheetRows(workbook, 'Iller');

  // --- 1) Satır düzeyinde doğrulama ve normalize edilmiş kayıtların üretimi ---
  const REQUIRED_COLUMNS = ['Sıra', 'İl', 'İlçe', 'Belde / Alt Birim', 'Mahalle', 'Birim Türü'];
  const rowErrors = [];
  const neighborhoodRecords = [];
  const seenSourceOrder = new Set();
  const seenExactKey = new Map();
  const duplicateExactRows = [];

  rawNeighborhoods.forEach((row, i) => {
    const excelRowNumber = i + 2; // 1 = header row in the spreadsheet
    for (const col of REQUIRED_COLUMNS) {
      if (row[col] === null || row[col] === undefined || String(row[col]).trim() === '') {
        rowErrors.push(`Satır ${excelRowNumber}: "${col}" alanı boş.`);
        return;
      }
    }

    const sourceOrder = Number(row['Sıra']);
    if (!Number.isInteger(sourceOrder) || sourceOrder <= 0) {
      rowErrors.push(`Satır ${excelRowNumber}: geçersiz "Sıra" değeri: ${row['Sıra']}`);
      return;
    }
    if (seenSourceOrder.has(sourceOrder)) {
      rowErrors.push(`Satır ${excelRowNumber}: yinelenen "Sıra" değeri: ${sourceOrder}`);
      return;
    }
    seenSourceOrder.add(sourceOrder);

    const provinceRaw = row['İl'];
    const districtRaw = row['İlçe'];
    const subUnitRaw = row['Belde / Alt Birim'];
    const neighborhoodRaw = row['Mahalle'];
    const unitType = String(row['Birim Türü']).trim();

    const id = padId(sourceOrder);

    const exactKey = `${provinceRaw}|${districtRaw}|${subUnitRaw}|${neighborhoodRaw}`;
    if (seenExactKey.has(exactKey)) {
      duplicateExactRows.push({
        id,
        sourceOrder,
        key: exactKey,
        firstSeenId: seenExactKey.get(exactKey),
      });
    } else {
      seenExactKey.set(exactKey, id);
    }

    neighborhoodRecords.push({
      id,
      type: 'neighborhood',
      province: toTurkishTitleCase(normalizeDisplayName(provinceRaw)),
      provinceSlug: slugify(provinceRaw),
      district: toTurkishTitleCase(normalizeDisplayName(districtRaw)),
      districtSlug: slugify(districtRaw),
      subUnit: toTurkishTitleCase(normalizeDisplayName(subUnitRaw)),
      subUnitSlug: slugify(subUnitRaw),
      neighborhood: toTurkishTitleCase(normalizeDisplayName(neighborhoodRaw)),
      neighborhoodSlug: slugify(neighborhoodRaw),
      unitType,
      sourceOrder,
      sourceHierarchy:
        row['Kaynak Bağlılık Bilgisi'] || `${provinceRaw} -> ${districtRaw} -> ${subUnitRaw}`,
      sourceRecordKey: row['Kayıt Anahtarı'] || null,
      reference: `neighborhood:${id}`,
    });
  });

  if (rowErrors.length > 0) {
    reportError(
      `${rowErrors.length} satırda veri sorunu bulundu (ilk 20 tanesi gösteriliyor):\n   ` +
        rowErrors.slice(0, 20).join('\n   ')
    );
    process.exitCode = 1;
    return;
  }

  // --- 2) Kontrol toplamları ---
  const distinctProvinceNames = new Set(rawNeighborhoods.map((r) => r['İl']));
  const distinctProvinceSlugs = new Set(neighborhoodRecords.map((r) => r.provinceSlug));
  const distinctDistrictGroupNames = new Set(
    rawNeighborhoods.map((r) => `${r['İl']}|${r['İlçe']}`)
  );
  const distinctDistrictGroupSlugs = new Set(
    neighborhoodRecords.map((r) => `${r.provinceSlug}/${r.districtSlug}`)
  );
  const officialDistrictRows = rawDistricts.filter((r) => r['Tür'] === 'İlçe');
  const provinceCenterRows = rawDistricts.filter((r) => r['Tür'] === 'İl Merkezi');

  const checks = [
    ['İl sayısı', distinctProvinceNames.size, EXPECTED.provinces],
    ['Resmî ilçe sayısı', officialDistrictRows.length, EXPECTED.officialDistricts],
    ['İl merkezi sayısı', provinceCenterRows.length, EXPECTED.provinceCenters],
    ['Toplam ilçe grubu (merkez dâhil)', rawDistricts.length, EXPECTED.districtGroups],
    ['Mahalle sayısı', neighborhoodRecords.length, EXPECTED.neighborhoods],
  ];

  console.log('\n--- Kontrol toplamları ---');
  let checksumFailed = false;
  for (const [label, actual, expected] of checks) {
    const pass = actual === expected;
    if (!pass) checksumFailed = true;
    console.log(`${pass ? '✅' : '❌'} ${label}: ${actual} (beklenen: ${expected})`);
  }

  console.log('\n--- Slug bütünlük kontrolleri ---');
  const provinceSlugCollision = distinctProvinceSlugs.size !== distinctProvinceNames.size;
  console.log(
    `${provinceSlugCollision ? '❌' : '✅'} İl slug benzersizliği: ${distinctProvinceSlugs.size} benzersiz slug / ${distinctProvinceNames.size} il`
  );
  const districtSlugCollision = distinctDistrictGroupSlugs.size !== distinctDistrictGroupNames.size;
  console.log(
    `${districtSlugCollision ? '❌' : '✅'} İlçe slug benzersizliği (il başına): ${distinctDistrictGroupSlugs.size} benzersiz slug / ${distinctDistrictGroupNames.size} ilçe grubu`
  );
  if (provinceSlugCollision || districtSlugCollision) checksumFailed = true;

  if (duplicateExactRows.length > 0) {
    reportWarning(
      `${duplicateExactRows.length} mahalle kaydı, aynı il/ilçe/alt birim içinde aynı isimle birden fazla kez geçiyor ` +
        '(kaynak dosyadaki orijinal kayıtlar korundu, her biri kendi benzersiz kimliğini aldı):'
    );
    for (const dup of duplicateExactRows.slice(0, 10)) {
      console.warn(`   - ${dup.id} (Sıra ${dup.sourceOrder}) ⇔ ${dup.firstSeenId}: ${dup.key}`);
    }
    if (duplicateExactRows.length > 10) {
      console.warn(`   ... ve ${duplicateExactRows.length - 10} kayıt daha.`);
    }
  }

  if (checksumFailed) {
    reportError(
      'Kontrol toplamları veya slug bütünlüğü beklenen değerlerle uyuşmuyor. ' +
        'Aktarım durduruldu, src/data/locations/ içeriği DEĞİŞTİRİLMEDİ.'
    );
    process.exitCode = 1;
    return;
  }

  // --- 3) İl / ilçe özet kayıtları ---
  const provinceOrderByName = new Map(rawProvinces.map((r) => [r['İl'], Number(r['İl Sıra'])]));
  const districtOrderByKey = new Map(
    rawDistricts.map((r) => [
      `${r['İl']}|${r['İlçe']}`,
      { sourceOrder: Number(r['Sıra']), type: r['Tür'] },
    ])
  );

  const provinceGroups = new Map();
  const districtGroups = new Map();

  for (const record of neighborhoodRecords) {
    if (!provinceGroups.has(record.provinceSlug)) {
      provinceGroups.set(record.provinceSlug, {
        id: `province:${record.provinceSlug}`,
        reference: `province:${record.provinceSlug}`,
        name: record.province,
        slug: record.provinceSlug,
        sourceOrder: provinceOrderByName.get(record.province.toLocaleUpperCase('tr-TR')) ?? null,
        districtSlugs: new Set(),
        neighborhoodCount: 0,
      });
    }
    const provinceGroup = provinceGroups.get(record.provinceSlug);
    provinceGroup.districtSlugs.add(record.districtSlug);
    provinceGroup.neighborhoodCount += 1;

    const districtKey = `${record.provinceSlug}/${record.districtSlug}`;
    if (!districtGroups.has(districtKey)) {
      const sourceInfo = districtOrderByKey.get(
        `${record.province.toLocaleUpperCase('tr-TR')}|${record.district.toLocaleUpperCase('tr-TR')}`
      );
      districtGroups.set(districtKey, {
        id: `district:${districtKey}`,
        reference: `district:${districtKey}`,
        name: record.district,
        slug: record.districtSlug,
        province: record.province,
        provinceSlug: record.provinceSlug,
        unitType:
          sourceInfo?.type ??
          (record.district.toLocaleUpperCase('tr-TR') === 'MERKEZ' ? 'İl Merkezi' : 'İlçe'),
        sourceOrder: sourceInfo?.sourceOrder ?? null,
        subUnitSlugs: new Set(),
        neighborhoodCount: 0,
      });
    }
    const districtGroup = districtGroups.get(districtKey);
    districtGroup.subUnitSlugs.add(record.subUnitSlug);
    districtGroup.neighborhoodCount += 1;
  }

  const provinces = [...provinceGroups.values()]
    .map((p) => ({
      id: p.id,
      reference: p.reference,
      name: p.name,
      slug: p.slug,
      districtCount: p.districtSlugs.size,
      neighborhoodCount: p.neighborhoodCount,
      sourceOrder: p.sourceOrder,
    }))
    .sort((a, b) => (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0));

  const districts = [...districtGroups.values()]
    .map((d) => ({
      id: d.id,
      reference: d.reference,
      name: d.name,
      slug: d.slug,
      province: d.province,
      provinceSlug: d.provinceSlug,
      unitType: d.unitType,
      subUnitCount: d.subUnitSlugs.size,
      neighborhoodCount: d.neighborhoodCount,
      sourceOrder: d.sourceOrder,
    }))
    .sort((a, b) => (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0));

  // --- 4) İl başına mahalle dosyaları + hafif indeks ---
  // location-index.json yalnızca "bu mahalle kimliği hangi ilin dosyasında?"
  // sorusuna cevap verir (id -> provinceSlug). Diğer tüm alanlar zaten ilgili
  // il dosyasındaki tam kayıtta mevcuttur; onları burada tekrar etmek 32.311
  // kayıt için gereksiz yere büyük (MB'larca) bir build-time dosyası yaratır.
  const neighborhoodsByProvince = new Map();
  const locationIndex = {};
  for (const record of neighborhoodRecords) {
    if (!neighborhoodsByProvince.has(record.provinceSlug)) {
      neighborhoodsByProvince.set(record.provinceSlug, []);
    }
    neighborhoodsByProvince.get(record.provinceSlug).push(record);
    locationIndex[record.id] = record.provinceSlug;
  }

  // --- 5) Dosyaları yaz ---
  mkdirSync(NEIGHBORHOODS_DIR, { recursive: true });

  // provinces/districts/summary stay pretty-printed (small, worth spot-checking by
  // hand); the index and per-province neighborhood files are compact since they're
  // only ever consumed by code (build-time resolver or client-side fetch).
  writeFileSync(
    path.join(OUTPUT_ROOT, 'provinces.json'),
    JSON.stringify(provinces, null, 2) + '\n'
  );
  writeFileSync(
    path.join(OUTPUT_ROOT, 'districts.json'),
    JSON.stringify(districts, null, 2) + '\n'
  );
  writeFileSync(path.join(OUTPUT_ROOT, 'location-index.json'), JSON.stringify(locationIndex));

  let writtenProvinceFiles = 0;
  for (const [provinceSlug, records] of neighborhoodsByProvince) {
    records.sort((a, b) => a.sourceOrder - b.sourceOrder);
    writeFileSync(path.join(NEIGHBORHOODS_DIR, `${provinceSlug}.json`), JSON.stringify(records));
    writtenProvinceFiles += 1;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(sourceFile),
    sourceFileSha256_16: sourceHash,
    sourceFileSizeBytes: fileBuffer.byteLength,
    counts: {
      provinces: provinces.length,
      officialDistricts: officialDistrictRows.length,
      provinceCenters: provinceCenterRows.length,
      districtGroups: districts.length,
      neighborhoods: neighborhoodRecords.length,
    },
    expected: EXPECTED,
    checksPassed: true,
    duplicateExactRowCount: duplicateExactRows.length,
    duplicateExactRows: duplicateExactRows,
    provinceFilesWritten: writtenProvinceFiles,
  };
  writeFileSync(path.join(OUTPUT_ROOT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

  console.log('\n--- Üretilen dosyalar ---');
  console.log(
    `✅ ${path.relative(PROJECT_ROOT, path.join(OUTPUT_ROOT, 'provinces.json'))} (${provinces.length} il)`
  );
  console.log(
    `✅ ${path.relative(PROJECT_ROOT, path.join(OUTPUT_ROOT, 'districts.json'))} (${districts.length} ilçe grubu)`
  );
  console.log(
    `✅ ${path.relative(PROJECT_ROOT, path.join(OUTPUT_ROOT, 'location-index.json'))} (${Object.keys(locationIndex).length} kayıt)`
  );
  console.log(
    `✅ ${path.relative(PROJECT_ROOT, NEIGHBORHOODS_DIR)}/*.json (${writtenProvinceFiles} il dosyası, toplam ${neighborhoodRecords.length} mahalle)`
  );
  console.log(`✅ ${path.relative(PROJECT_ROOT, path.join(OUTPUT_ROOT, 'summary.json'))}`);
  console.log('\n✅ Konum verisi aktarımı başarıyla tamamlandı.');
  console.log(
    'ℹ️  Not: Bu script hiçbir HTML sayfası üretmez. 32.311 mahalle için otomatik sayfa üretimi ' +
      'kesinlikle yapılmaz — yalnızca yayımlanmış özgün içeriği olan konumlar için sayfa oluşturulur.'
  );
}

main();
