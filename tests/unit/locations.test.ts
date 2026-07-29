import { describe, it, expect } from 'vitest';
import {
  getProvinces,
  getDistricts,
  getProvinceBySlug,
  getDistrictBySlug,
  getDistrictsForProvince,
  getNeighborhoodById,
  parseLocationRef,
  resolveLocationRef,
  isValidLocationRef,
} from '../../src/lib/locations';

describe('konum verisi bütünlüğü', () => {
  it('tam olarak 81 il içerir', () => {
    expect(getProvinces()).toHaveLength(81);
  });

  it('tam olarak 973 ilçe grubu içerir (merkez dâhil)', () => {
    expect(getDistricts()).toHaveLength(973);
  });
});

describe('parseLocationRef', () => {
  it('bir il referansını ayrıştırır', () => {
    expect(parseLocationRef('province:istanbul')).toEqual({
      type: 'province',
      provinceSlug: 'istanbul',
    });
  });

  it('bir ilçe referansını ayrıştırır', () => {
    expect(parseLocationRef('district:canakkale/merkez')).toEqual({
      type: 'district',
      provinceSlug: 'canakkale',
      districtSlug: 'merkez',
    });
  });

  it('geçersiz bir formatı reddeder', () => {
    expect(parseLocationRef('gecersiz-referans')).toBeNull();
    expect(parseLocationRef('district:tek-parca')).toBeNull();
    expect(parseLocationRef('neighborhood:not-an-id')).toBeNull();
  });
});

describe('resolveLocationRef', () => {
  it('gerçek bir ili çözer', () => {
    const resolved = resolveLocationRef('province:canakkale');
    expect(resolved).not.toBeNull();
    expect(resolved?.province).toBe('Çanakkale');
    expect(resolved?.urlPath).toBe('canakkale');
  });

  it('gerçek bir ilçeyi (il merkezi) çözer ve tam hiyerarşi/breadcrumb üretir', () => {
    const resolved = resolveLocationRef('district:canakkale/merkez');
    expect(resolved).not.toBeNull();
    expect(resolved?.province).toBe('Çanakkale');
    expect(resolved?.district).toBe('Merkez');
    expect(resolved?.urlPath).toBe('canakkale/merkez');
    expect(resolved?.breadcrumb).toEqual([
      { label: 'Çanakkale', slug: 'canakkale' },
      { label: 'Merkez', slug: 'merkez' },
    ]);
  });

  it('var olmayan bir konum için null döner', () => {
    expect(resolveLocationRef('province:bu-il-yok')).toBeNull();
    expect(resolveLocationRef('district:canakkale/olmayan-ilce')).toBeNull();
    expect(resolveLocationRef('neighborhood:m-999999')).toBeNull();
    expect(resolveLocationRef('gecersiz')).toBeNull();
  });
});

describe('isValidLocationRef', () => {
  it('geçerli referanslar için true döner', () => {
    expect(isValidLocationRef('province:istanbul')).toBe(true);
  });
  it('geçersiz referanslar için false döner', () => {
    expect(isValidLocationRef('province:bu-il-yok')).toBe(false);
  });
});

describe('getProvinceBySlug / getDistrictBySlug / getDistrictsForProvince', () => {
  it('İstanbul ilini bulur', () => {
    const province = getProvinceBySlug('istanbul');
    expect(province?.name).toBe('İstanbul');
  });

  it('Başakşehir ilçesini İstanbul altında bulur', () => {
    const district = getDistrictBySlug('istanbul', 'basaksehir');
    expect(district?.name).toBe('Başakşehir');
    expect(district?.province).toBe('İstanbul');
  });

  it('bir ile ait tüm ilçeleri listeler', () => {
    const districts = getDistrictsForProvince('canakkale');
    expect(districts.length).toBeGreaterThan(0);
    expect(districts.every((d) => d.provinceSlug === 'canakkale')).toBe(true);
  });
});

describe('getNeighborhoodById', () => {
  it('gerçek bir mahalle kaydını bulur (Bahçeşehir 1. Kısım)', () => {
    const record = getNeighborhoodById('m-014132');
    expect(record).toBeDefined();
    expect(record?.neighborhood).toBe('Bahçeşehir 1. Kısım');
    expect(record?.province).toBe('İstanbul');
    expect(record?.district).toBe('Başakşehir');
  });

  it('var olmayan bir kimlik için undefined döner', () => {
    expect(getNeighborhoodById('m-999999')).toBeUndefined();
  });
});
