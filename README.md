# KonutArsa

**İlan değil, analiz.**

KonutArsa (konutarsa.com), Türkiye'de konut veya arsa almadan önce araştırma yapmak isteyenler için hazırlanmış bağımsız bir **içerik/analiz** platformudur. Bu bir ilan sitesi **değildir**: üyelik, ilan verme, mesajlaşma, ödeme veya emlakçı profili gibi hiçbir işlevi yoktur ve olmayacaktır. Site; tapu, imar, mevzuat, bölge analizi ve piyasa takibi konularında kaynaklı, editoryal içerik yayımlar.

Site tamamen **statik** olarak üretilir (Astro `output: 'static'`), veritabanı veya sunucu tarafı oturum yönetimi yoktur; içerik Git deposundaki Markdown dosyalarından derlenir ve Cloudflare Pages üzerinde statik dosya olarak sunulur.

## Teknoloji yığını

| Katman           | Teknoloji                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework        | [Astro](https://astro.build) 7 (statik çıktı, sıfır istemci JS varsayılan)                                                                 |
| Dil              | TypeScript (strict mod)                                                                                                                    |
| Paket yöneticisi | pnpm                                                                                                                                       |
| İçerik           | Astro Content Layer (Markdown + YAML front-matter), [Pages CMS](https://pagescms.org) (barındırılan, Git tabanlı editör paneli)            |
| Site içi arama   | [Pagefind](https://pagefind.app) (build-time indeksleme, sıfır sunucu maliyeti)                                                            |
| Görsel işleme    | [Sharp](https://sharp.pixelplumbing.com) (yalnızca build sırasında; runtime görsel işleme yok)                                             |
| Doğrulama        | [Zod](https://zod.dev) (içerik şeması), özel script'ler (bkz. `scripts/validate-content.mjs`)                                              |
| Test             | [Vitest](https://vitest.dev) (birim), [Playwright](https://playwright.dev) (e2e), [axe-core](https://www.deque.com/axe/) (erişilebilirlik) |
| Barındırma       | Cloudflare Pages (statik)                                                                                                                  |

Kasıtlı olarak **kullanılmayanlar**: React/Vue/Svelte, Tailwind/Bootstrap, jQuery, harici font servisleri, herhangi bir veritabanı veya kimlik doğrulama sistemi. Stil tamamen düz CSS + tasarım token'larıyla (`src/styles/tokens.css`) yazılmıştır.

## Gereksinimler

- Node.js ≥ 22.12 (proje, `.mjs` script'lerinden `.ts` dosyalarını doğrudan import edebilmek için Node'un yerleşik TypeScript tip-temizleme özelliğine dayanır)
- pnpm ≥ 9

## Hızlı başlangıç

```bash
pnpm install

# Türkiye il/ilçe/mahalle verisini data-source/ klasöründeki xlsx'ten içe aktarır
pnpm locations:import

# Geliştirme sunucusu (http://localhost:4321)
pnpm dev

# Üretim derlemesi (dist/)
pnpm build

# Derlenmiş siteyi yerelde önizle
pnpm preview
```

`.env.example` dosyasını `.env` olarak kopyalayıp ihtiyacınıza göre doldurun (bkz. aşağıdaki ortam değişkenleri tablosu ve ilgili kılavuzlar). Gerçek bir gizli anahtar/kimlik girilmediği sürece reklam ve analytics sistemleri **kapalı** kalır.

## Sık kullanılan komutlar

| Komut                                             | Açıklama                                                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                        | Geliştirme sunucusu                                                                                                                                                   |
| `pnpm build`                                      | Tam üretim derlemesi (robots/ads.txt/_headers üretimi → görsel optimizasyonu → tip kontrolü → Astro build → Pagefind indeksi → link kontrolü → dosya sayısı kontrolü) |
| `pnpm preview`                                    | `dist/` klasörünü yerelde sunar                                                                                                                                       |
| `pnpm check`                                      | `astro check` + `eslint` + içerik doğrulama                                                                                                                           |
| `pnpm lint` / `pnpm format` / `pnpm format:check` | ESLint / Prettier                                                                                                                                                     |
| `pnpm test`                                       | Vitest birim testleri                                                                                                                                                 |
| `pnpm test:e2e`                                   | Playwright uçtan uca testleri (Chromium masaüstü + mobil, axe-core erişilebilirlik taramaları dahil)                                                                  |
| `pnpm content:validate`                           | İçerik front-matter'ını ve `[[source:key]]` atıflarını doğrular                                                                                                       |
| `pnpm content:stale`                              | Belirli bir yaşı geçen içerikleri ve (best-effort) kaynak bağlantı erişilebilirliğini raporlar                                                                        |
| `pnpm locations:import`                           | `data-source/` altındaki resmî il/ilçe/mahalle xlsx dosyasını `src/data/locations/` altına aktarır                                                                    |
| `pnpm images:prepare`                             | `public/uploads/images` altındaki görselleri build-time'da optimize eder                                                                                              |
| `pnpm search:build`                               | Derlenmiş `dist/` üzerinde Pagefind indeksini oluşturur                                                                                                               |
| `pnpm indexnow:key` / `pnpm indexnow:submit`      | IndexNow anahtarı üretimi ve (etkinse) değişen URL'lerin bildirimi                                                                                                    |

## Dizin yapısı (özet)

```
src/
  content/            İçerik koleksiyonları (Markdown + front-matter)
    konut-rehberi/ arsa-rehberi/ bolge-analizleri/ mevzuat/
    piyasa-raporlari/ guncel/ sozluk/ authors/
  content.config.ts    Zod şemaları (bkz. CONTENT_GUIDE_TR.md)
  data/                site.json, site-content.json, ads.json, social.json,
                       navigation.json, locations/ (üretilen konum verisi)
  layouts/             BaseLayout, ArticleLayout, CategoryLayout, StaticPageLayout
  components/          seo/, article/, ads/, common/, layout/, cards/
  lib/                 Saf TypeScript yardımcıları (seo, schema, ads, locations,
                       slug, content, urls, dates, reading-time, analytics …)
  pages/               Astro sayfa rotaları (her koleksiyon için index + [slug])
scripts/               Node build/CI script'leri (bkz. altbaşlıklar)
tests/unit/            Vitest testleri
tests/e2e/             Playwright testleri
data-source/           Ham resmî il/ilçe/mahalle xlsx kaynağı (yalnızca girdi)
.pages.yml             Pages CMS panel tanımı (bkz. EDITOR_GUIDE_TR.md)
```

## Dokümantasyon

| Dosya                                                          | Konu                                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`EDITOR_GUIDE_TR.md`](./EDITOR_GUIDE_TR.md)                   | Pages CMS panelini kullanan, teknik olmayan içerik editörü için adım adım kılavuz |
| [`CONTENT_GUIDE_TR.md`](./CONTENT_GUIDE_TR.md)                 | İçerik koleksiyonları, şema alanları, editoryal kalite kuralları                  |
| [`SEO_OPERATIONS_TR.md`](./SEO_OPERATIONS_TR.md)               | SEO/AEO/GEO altyapısı, sitemap/robots mantığı, arama motoru doğrulama             |
| [`DEPLOYMENT_CLOUDFLARE_TR.md`](./DEPLOYMENT_CLOUDFLARE_TR.md) | Cloudflare Pages kurulumu ve yayınlama                                            |
| [`ADSENSE_SETUP_TR.md`](./ADSENSE_SETUP_TR.md)                 | Google AdSense'i etkinleştirme (varsayılan kapalı)                                |
| [`DIRECT_ADS_GUIDE_TR.md`](./DIRECT_ADS_GUIDE_TR.md)           | Doğrudan/sponsor reklamları yönetme                                               |
| [`LOCATION_DATA_GUIDE_TR.md`](./LOCATION_DATA_GUIDE_TR.md)     | İl/ilçe/mahalle verisi, konum referansları, konum bulucu                          |
| [`SECURITY_AND_PRIVACY_TR.md`](./SECURITY_AND_PRIVACY_TR.md)   | Güvenlik başlıkları, CSP, gizlilik/çerez yaklaşımı                                |

## Temel ilkeler

- **Sahte veri üretilmez.** İstatistik, fiyat, kaynak, yazar unvanı/uzmanlığı, sponsor, kullanıcı yorumu veya AdSense/Analytics kimliği hiçbir zaman uydurulmaz. Gerçek bilgi yoksa alan boş bırakılır.
- **32.311 mahalle sayfası yoktur ve olmayacaktır.** Konum verisi yalnızca bir "konum bulucu" aracı ve gerçek, özgün editoryal içeriğin bağlandığı bölge analizleri için kullanılır (bkz. `LOCATION_DATA_GUIDE_TR.md`).
- **Reklam ve analytics varsayılan kapalıdır.** Gerekli ortam değişkenleri ve gerçek kimlikler girilmeden hiçbir script, iframe veya reklam alanı render edilmez.
- **Taslak/yayın ayrımı korunur.** `status: draft` içerikler sitede hiçbir zaman görünmez, sitemap'e girmez ve RSS/arama indeksine dahil edilmez.
