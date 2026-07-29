/**
 * Konum verisi çözümleyici (build-time / server-only).
 *
 * `node:fs` kullanır — yalnızca Astro frontmatter, `content.config.ts` veya
 * başka bir sunucu/build-time bağlamından çağrılmalıdır. Tarayıcıda çalışan
 * `<script>` blokları için BU MODÜLÜ KULLANMAYIN; konum bulucu aracının
 * istemci tarafı, ilgili il dosyasını Vite'in `import.meta.glob` mekanizmasıyla
 * ayrı bir chunk olarak isteğe bağlı yükler (bkz. src/pages/bolgeler/konum-bul.astro).
 *
 * Veri kaynağı: scripts/import-locations.mjs tarafından üretilen
 * src/data/locations/*.json dosyaları. Bu dosyalar olmadan (ör. proje ilk kez
 * klonlandığında import script hiç çalıştırılmamışsa) bu modül boş sonuç
 * döner ve build sırasında locationRef doğrulaması net bir hata verir.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type LocationRefType = 'province' | 'district' | 'neighborhood';

export interface NeighborhoodRecord {
  id: string;
  type: 'neighborhood';
  province: string;
  provinceSlug: string;
  district: string;
  districtSlug: string;
  subUnit: string;
  subUnitSlug: string;
  neighborhood: string;
  neighborhoodSlug: string;
  unitType: string;
  sourceOrder: number;
  sourceHierarchy: string;
  sourceRecordKey: string | null;
  reference: string;
}

export interface ProvinceSummary {
  id: string;
  reference: string;
  name: string;
  slug: string;
  districtCount: number;
  neighborhoodCount: number;
  sourceOrder: number | null;
}

export interface DistrictSummary {
  id: string;
  reference: string;
  name: string;
  slug: string;
  province: string;
  provinceSlug: string;
  unitType: string;
  subUnitCount: number;
  neighborhoodCount: number;
  sourceOrder: number | null;
}

export interface ResolvedLocation {
  type: LocationRefType;
  reference: string;
  province: string;
  provinceSlug: string;
  district?: string;
  districtSlug?: string;
  subUnit?: string;
  subUnitSlug?: string;
  neighborhood?: string;
  neighborhoodSlug?: string;
  /** Ordered breadcrumb labels from province down to the resolved level. */
  breadcrumb: { label: string; slug: string }[];
  /** URL-safe path built from province/district slugs, e.g. "canakkale/merkez". */
  urlPath: string;
}

const DATA_DIR = fileURLToPath(new URL('../data/locations/', import.meta.url));

function loadJson<T>(relativePath: string): T | null {
  const fullPath = `${DATA_DIR}${relativePath}`;
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, 'utf8')) as T;
  } catch {
    return null;
  }
}

let provincesCache: ProvinceSummary[] | null = null;
let districtsCache: DistrictSummary[] | null = null;
let neighborhoodIndexCache: Record<string, string> | null = null;
const neighborhoodFileCache = new Map<string, NeighborhoodRecord[]>();

export function getProvinces(): ProvinceSummary[] {
  if (!provincesCache) provincesCache = loadJson<ProvinceSummary[]>('provinces.json') ?? [];
  return provincesCache;
}

export function getDistricts(): DistrictSummary[] {
  if (!districtsCache) districtsCache = loadJson<DistrictSummary[]>('districts.json') ?? [];
  return districtsCache;
}

export function getProvinceBySlug(slug: string): ProvinceSummary | undefined {
  return getProvinces().find((p) => p.slug === slug);
}

export function getDistrictBySlug(
  provinceSlug: string,
  districtSlug: string
): DistrictSummary | undefined {
  return getDistricts().find((d) => d.provinceSlug === provinceSlug && d.slug === districtSlug);
}

export function getDistrictsForProvince(provinceSlug: string): DistrictSummary[] {
  return getDistricts().filter((d) => d.provinceSlug === provinceSlug);
}

function getNeighborhoodIndex(): Record<string, string> {
  if (!neighborhoodIndexCache) {
    neighborhoodIndexCache = loadJson<Record<string, string>>('location-index.json') ?? {};
  }
  return neighborhoodIndexCache;
}

function getNeighborhoodsForProvince(provinceSlug: string): NeighborhoodRecord[] {
  const cached = neighborhoodFileCache.get(provinceSlug);
  if (cached) return cached;
  const records = loadJson<NeighborhoodRecord[]>(`neighborhoods/${provinceSlug}.json`) ?? [];
  neighborhoodFileCache.set(provinceSlug, records);
  return records;
}

export function getNeighborhoodById(id: string): NeighborhoodRecord | undefined {
  const provinceSlug = getNeighborhoodIndex()[id];
  if (!provinceSlug) return undefined;
  return getNeighborhoodsForProvince(provinceSlug).find((n) => n.id === id);
}

interface ParsedRef {
  type: LocationRefType;
  provinceSlug: string;
  districtSlug?: string;
  neighborhoodId?: string;
}

/** Parses "province:slug", "district:province-slug/district-slug", or "neighborhood:m-000001". */
export function parseLocationRef(ref: string): ParsedRef | null {
  const match = /^(province|district|neighborhood):(.+)$/.exec(ref.trim());
  if (!match) return null;
  const [, type, value] = match;

  if (type === 'province') {
    if (!value || value.includes('/')) return null;
    return { type: 'province', provinceSlug: value };
  }

  if (type === 'district') {
    const parts = (value ?? '').split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return { type: 'district', provinceSlug: parts[0], districtSlug: parts[1] };
  }

  if (type === 'neighborhood') {
    if (!value || !/^m-\d{6}$/.test(value)) return null;
    const record = getNeighborhoodById(value);
    if (!record) return null;
    return { type: 'neighborhood', provinceSlug: record.provinceSlug, neighborhoodId: value };
  }

  return null;
}

/** Fully resolves a locationRef string to display names, slugs, and a breadcrumb. Returns null if invalid. */
export function resolveLocationRef(ref: string): ResolvedLocation | null {
  const parsed = parseLocationRef(ref);
  if (!parsed) return null;

  if (parsed.type === 'province') {
    const province = getProvinceBySlug(parsed.provinceSlug);
    if (!province) return null;
    return {
      type: 'province',
      reference: province.reference,
      province: province.name,
      provinceSlug: province.slug,
      breadcrumb: [{ label: province.name, slug: province.slug }],
      urlPath: province.slug,
    };
  }

  if (parsed.type === 'district') {
    const district = getDistrictBySlug(parsed.provinceSlug, parsed.districtSlug ?? '');
    if (!district) return null;
    return {
      type: 'district',
      reference: district.reference,
      province: district.province,
      provinceSlug: district.provinceSlug,
      district: district.name,
      districtSlug: district.slug,
      breadcrumb: [
        { label: district.province, slug: district.provinceSlug },
        { label: district.name, slug: district.slug },
      ],
      urlPath: `${district.provinceSlug}/${district.slug}`,
    };
  }

  // neighborhood
  const record = getNeighborhoodById(parsed.neighborhoodId ?? '');
  if (!record) return null;
  return {
    type: 'neighborhood',
    reference: record.reference,
    province: record.province,
    provinceSlug: record.provinceSlug,
    district: record.district,
    districtSlug: record.districtSlug,
    subUnit: record.subUnit,
    subUnitSlug: record.subUnitSlug,
    neighborhood: record.neighborhood,
    neighborhoodSlug: record.neighborhoodSlug,
    breadcrumb: [
      { label: record.province, slug: record.provinceSlug },
      { label: record.district, slug: record.districtSlug },
      { label: record.neighborhood, slug: record.neighborhoodSlug },
    ],
    urlPath: `${record.provinceSlug}/${record.districtSlug}`,
  };
}

/** Fast boolean check for zod `.refine()` — true if the reference resolves to real location data. */
export function isValidLocationRef(ref: string): boolean {
  return resolveLocationRef(ref) !== null;
}
