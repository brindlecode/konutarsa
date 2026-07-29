# Doğrudan (Sponsor) Reklam Kılavuzu

Bu doküman, AdSense'ten **bağımsız**, sitenin doğrudan anlaştığı sponsorlar için gösterilen "doğrudan reklam" sistemini açıklar. AdSense kurulumu için `ADSENSE_SETUP_TR.md`'ye bakın.

## 1. İki farklı sistemi karıştırmayın

KonutArsa'da iki ayrı, birbirinden bağımsız "sponsorluk" mekanizması vardır:

| Sistem                                       | Ne zaman kullanılır                                                              | Nerede yönetilir                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **İçerik sponsorluğu** (`sponsorship` alanı) | Belirli bir yazı/analiz gerçekten bir sponsorluk anlaşması kapsamında yazıldıysa | İlgili içeriğin front-matter'ında, Pages CMS panelinde (bkz. `EDITOR_GUIDE_TR.md` §6) |
| **Doğrudan reklam** (bu doküman)             | Sayfalarda görsel/banner biçiminde gösterilen, tıklanabilir bir reklam kreatifi  | `src/data/ads.json` — Pages CMS'te "Reklamlar" ekranı                                 |

Bu ikisi bağımsızdır: bir içerik hem sponsorlu olabilir hem de sayfada ayrıca bir doğrudan reklam gösterilebilir; ya da hiçbiri kullanılmayabilir.

## 2. Varsayılan durum: kapalı

Doğrudan reklamlar, `src/data/site.json` içindeki `ads.directAdsEnabled` `true` olmadıkça **hiç gösterilmez** (`src/lib/ads.ts#isDirectAdsEnabled`). `src/data/ads.json` içinde şu anda yalnızca `active: false` olan bir örnek kayıt bulunur — bu, gerçek bir reklam değildir ve render edilmez.

## 3. `ads.json` alan referansı

Pages CMS'teki "Reklamlar" ekranından (veya doğrudan dosyadan) her reklam kaydı şu alanları içerir:

```jsonc
{
  "id": "benzersiz-kisa-kimlik", // örn. "yapi-kredi-2026-q1"
  "active": false, // true olmadan hiç gösterilmez
  "advertiser": "", // reklam veren firmanın gerçek adı
  "label": "Reklam", // görünür rozet metni (şeffaflık için)
  "image": "", // /uploads/images/... yolu
  "alt": "", // görsel alt metni (zorunlu tutulmalı)
  "destinationUrl": "", // tıklanınca gidilecek gerçek adres
  "placement": "article-bottom", // bkz. §4
  "startAt": "", // ISO tarih, boşsa sınırsız başlar
  "endAt": "", // ISO tarih, boşsa sınırsız sürer
  "targeting": {
    "categories": [], // boşsa: her kategoride göster
    "provinces": [], // boşsa: her ilde göster
    "districts": [], // boşsa: her ilçede göster
  },
}
```

- `active: false` veya `startAt`/`endAt` aralığı dışındaki bir kayıt **hiç render edilmez** (`isAdCurrentlyActive`).
- Bir hedefleme dizisi (`categories`/`provinces`/`districts`) **boşsa** o boyutta hedefleme yapılmaz (her yerde gösterilir); doluysa yalnızca eşleşen sayfalarda gösterilir (`matchesTargeting`).
- Aynı yerleşimde birden fazla uygun reklam varsa yalnızca **ilk eşleşen** gösterilir (bkz. `AdSlot.astro`) — birden fazla reklamın aynı anda üst üste gösterilmesi engellenir.

## 4. Yerleşimler (`placement`)

Şu anda koda gömülü tek yerleşim `article-bottom`'dur (her makale sayfasının sonunda). Yeni bir yerleşim eklemek geliştirici müdahalesi gerektirir: ilgili layout/bileşene `<AdSlot placement="yeni-yerlesim-adi" .../>` eklenmeli, ardından `ads.json`'daki kayıtlarda aynı `placement` string'i kullanılmalıdır. `placement` değerleri serbest metin olduğundan yazım hatasına dikkat edin — koddaki değerle birebir eşleşmezse reklam hiç gösterilmez.

## 5. AdSense ile öncelik ilişkisi

`AdSlot.astro`, aynı yerleşimde bir doğrudan reklam bulursa **AdSense'i o yerleşimde göstermez** (doğrudan reklam her zaman önceliklidir). AdSense yalnızca o yerleşimde uygun bir doğrudan reklam yokken ve AdSense etkinse devreye girer.

## 6. Şeffaflık ve etiketleme

Her doğrudan reklam görsel olarak "Reklam" rozeti ile işaretlenir (`label` alanı) ve bağlantı `rel="sponsored noopener noreferrer"` ile işaretlenir — bu, hem kullanıcıya hem arama motorlarına bunun ücretli/sponsorlu bir bağlantı olduğunu açıkça belirtir. `label` alanını "Reklam" dışında bir şeye çevirirken bu şeffaflığı koruyun (örn. "Sponsorlu").

## 7. Yeni bir reklam eklerken kontrol listesi

- [ ] `advertiser`, gerçek bir reklam vereni mi gösteriyor (uydurma isim yok)?
- [ ] `destinationUrl`, gerçekten anlaşılan sponsorun sayfasına mı gidiyor?
- [ ] `image`/`alt` dolduruldu mu?
- [ ] `active: true` yapılmadan önce `startAt`/`endAt` doğru mu?
- [ ] `targeting` alanları, anlaşmanın kapsamına (belirli il/ilçe/kategori) uygun mu, yoksa kasıtlı olarak boş mu (her yerde göster)?
