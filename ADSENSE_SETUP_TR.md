# Google AdSense Kurulum Kılavuzu

## 1. Mevcut durum: varsayılan kapalı

KonutArsa'nın ilk sürümünde AdSense **etkin değildir**. Bu bilinçli bir karardır — reklam onayı ve gerçek kimlik alınmadan hiçbir script, iframe veya reklam alanı render edilmez; sahte/placeholder reklam alanı da gösterilmez (`AdSlot.astro`, ilgili koşullar sağlanmadıkça literal olarak hiçbir şey render etmez).

AdSense'in etkin sayılması için **üçü birden** doğru olmalıdır (`src/lib/ads.ts#isAdsenseEnabled`):

1. `src/data/site.json` içinde `ads.adsenseEnabled: true`
2. Ortam değişkeni `PUBLIC_ADSENSE_ENABLED=true`
3. Ortam değişkeni `PUBLIC_ADSENSE_CLIENT` gerçek bir yayıncı kimliğiyle dolu

## 2. Etkinleştirme adımları

1. [Google AdSense](https://www.google.com/adsense/) üzerinden site için onay alın (bu, Google'ın kendi inceleme süreci gerektirir — bu depo/kod bunu hızlandıramaz).
2. Onay sonrası AdSense panelinizden yayıncı kimliğinizi (`ca-pub-XXXXXXXXXXXXXXXX` biçiminde) ve kullanmak istediğiniz reklam birimi (slot) kimliklerini alın.
3. `src/data/site.json` içinde `ads.adsenseEnabled` değerini `true` yapın (bu dosya Pages CMS'te editöre gösterilmez; teknik ekip tarafından değiştirilir — bkz. `.pages.yml` yorumları).
4. Cloudflare Pages proje ayarlarında (Production ortamı) şu değişkenleri girin:

   | Değişken                                                         | Örnek                                               |
   | ---------------------------------------------------------------- | --------------------------------------------------- |
   | `PUBLIC_ADSENSE_ENABLED`                                         | `true`                                              |
   | `PUBLIC_ADSENSE_CLIENT`                                          | `ca-pub-1234567890123456`                           |
   | `PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM`                             | AdSense panelinden aldığınız gerçek slot ID         |
   | `PUBLIC_ADSENSE_SLOT_ARTICLE_TOP`, `_ARTICLE_MIDDLE`, `_SIDEBAR` | Yalnızca ilgili yerleşimi gerçekten kullanacaksanız |

5. Yeniden dağıtın.

**Asla** gerçek olmayan/tahmini bir `ca-pub-...` değeri girmeyin — hem Google AdSense politikalarına aykırıdır hem de bu depo bunu geçersiz kabul edip `ads.txt`'ye yazmaz (bkz. §4).

## 3. Şu anda koda gömülü yerleşimler

Şu anda yalnızca **makale sayfası altı** (`article-bottom`) yerleşimi, `ArticleLayout.astro` içinde `<AdSlot placement="article-bottom" adsenseSlotId={import.meta.env.PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM} />` olarak koda bağlıdır. Diğer ortam değişkenleri (`_ARTICLE_TOP`, `_ARTICLE_MIDDLE`, `_SIDEBAR`) ileride ek yerleşimler eklemek isteyen geliştiriciler için önceden tanımlanmıştır, ancak bir `<AdSlot>` çağrısıyla bir layout'a eklenmedikçe hiçbir etkisi yoktur.

Yeni bir yerleşim eklemek için: ilgili layout/bileşene `<AdSlot placement="..." adsenseSlotId={...} />` ekleyin (bkz. `src/components/ads/AdSlot.astro`).

## 4. `ads.txt` otomatik üretimi

`scripts/generate-ads-txt.mjs`, her build'de `public/ads.txt`'yi üretir:

- `PUBLIC_ADSENSE_CLIENT` geçerli bir `ca-pub-\d{10,}` biçimindeyse: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0` satırı yazılır.
- Değilse: **geçersiz/sahte bir satır asla yazılmaz** — yalnızca ne yapılması gerektiğini açıklayan yorum satırları üretilir.

Bu dosyayı elle düzenlemeyin; her `pnpm build` (veya tek başına `pnpm ads:generate`) çalıştığında yeniden üretilir.

## 5. İçerik Güvenlik Politikası (CSP) genişletmesi

`scripts/generate-headers.mjs`, yalnızca `PUBLIC_ADSENSE_ENABLED=true` **ve** gerçek bir `PUBLIC_ADSENSE_CLIENT` tanımlıyken, `_headers` dosyasındaki CSP'ye AdSense'in gerçekten ihtiyaç duyduğu resmî Google alan adlarını (`pagead2.googlesyndication.com`, `*.doubleclick.net` vb.) ekler. AdSense kapalıyken bu alan adları CSP'de **hiç yer almaz** — bkz. `SECURITY_AND_PRIVACY_TR.md`.

## 6. Onay (consent) katmanı

AdSense veya GA4 etkinleştirildiğinde, `BaseLayout.astro` otomatik olarak bir çerez onay bandı (`ConsentBanner.astro`) render eder. Kullanıcı "Kabul et" demeden reklam/analytics script'leri **yüklenmez** (`window.konutarsaConsent` + `konutarsa:consent-updated` olayı ile onay sonrası yükleme yapılır — bkz. `public/scripts/ga-loader.js`).

⚠️ Bu banner sertifikalı bir CMP (Consent Management Platform) **değildir**. AB/EEA kullanıcılarına gerçekten reklam gösterecekseniz, canlıya çıkmadan önce Google'ın güncel [Consent Mode](https://support.google.com/adspolicy/answer/13554116) ve EEA CMP gereksinimlerini resmî Google dokümantasyonundan doğrulayın ve gerekirse kayıtlı bir CMP entegre edin.

## 7. Kapatmak isterseniz

`PUBLIC_ADSENSE_ENABLED=false` yapmak (veya değişkeni tanımsız bırakmak) yeterlidir — tüm AdSense script'leri, CSP genişletmesi ve `ads.txt` gerçek satırı otomatik olarak devre dışı kalır/kaldırılır.
