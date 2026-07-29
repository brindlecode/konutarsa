import siteData from '../data/site.json';
import adsDataRaw from '../data/ads.json';

export interface DirectAd {
  id: string;
  active: boolean;
  advertiser: string;
  label: string;
  image: string;
  alt: string;
  destinationUrl: string;
  placement: string;
  startAt: string;
  endAt: string;
  targeting: {
    categories: string[];
    provinces: string[];
    districts: string[];
  };
}

const adsData = adsDataRaw as DirectAd[];

/** AdSense yalnızca site ayarı VE ortam değişkeni VE gerçek publisher ID'si birlikte varsa etkin sayılır. */
export function isAdsenseEnabled(): boolean {
  return (
    siteData.ads.adsenseEnabled &&
    import.meta.env.PUBLIC_ADSENSE_ENABLED === 'true' &&
    Boolean(import.meta.env.PUBLIC_ADSENSE_CLIENT)
  );
}

export function isDirectAdsEnabled(): boolean {
  return siteData.ads.directAdsEnabled;
}

export function isAdCurrentlyActive(ad: DirectAd, now: Date = new Date()): boolean {
  if (!ad.active) return false;
  if (ad.startAt && new Date(ad.startAt).getTime() > now.getTime()) return false;
  if (ad.endAt && new Date(ad.endAt).getTime() < now.getTime()) return false;
  return true;
}

export interface AdTargetingContext {
  placement: string;
  category?: string;
  provinceSlug?: string;
  districtSlug?: string;
}

/** Boş hedefleme dizisi = global (her yerde göster); dolu dizi = yalnızca eşleşenlerde göster. */
export function matchesTargeting(ad: DirectAd, context: AdTargetingContext): boolean {
  if (ad.placement !== context.placement) return false;
  const { categories, provinces, districts } = ad.targeting;
  if (categories.length > 0 && (!context.category || !categories.includes(context.category)))
    return false;
  if (provinces.length > 0 && (!context.provinceSlug || !provinces.includes(context.provinceSlug)))
    return false;
  if (districts.length > 0 && (!context.districtSlug || !districts.includes(context.districtSlug)))
    return false;
  return true;
}

export function getActiveAdsForPlacement(
  context: AdTargetingContext,
  now: Date = new Date()
): DirectAd[] {
  if (!isDirectAdsEnabled()) return [];
  return adsData.filter((ad) => isAdCurrentlyActive(ad, now) && matchesTargeting(ad, context));
}

export function getAllDirectAds(): DirectAd[] {
  return adsData;
}
