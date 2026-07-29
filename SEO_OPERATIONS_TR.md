# SEO / AEO / GEO Operasyon Kılavuzu

Bu doküman, sitenin arama motoru optimizasyonu (SEO), cevap motoru optimizasyonu (AEO) ve üretken yapay zekâ arama/özetleme sistemleri (GEO) için kurulan altyapıyı ve bunu işletme/doğrulama adımlarını açıklar.

## 1. Canonical, title, description, robots

Tüm sayfa metaverisi tek bir merkezden (`src/lib/seo.ts`) hesaplanır:

- **Title**: `resolveTitle()` → `"{başlık} | KonutArsa"` (ana sayfa hariç, ana sayfa kendi tam başlığını kullanır).
- **Description**: `resolveDescription()` şu öncelik sırasını izler: `seo.descriptionOverride` → `excerpt` → `quickAnswer` → site geneli açıklama; 160 karakteri aşan her durumda `…` ile kısaltılır.
- **Canonical**: `resolveCanonical()` — `seo.canonicalOverride` verilmemişse mevcut yoldan mutlak URL üretir. Override yalnızca `https://konutarsa.com` alan adında bir adres olabilir (şema doğrulaması, bkz. `content.config.ts`).
- **Robots meta**: `resolvePageRobots()` — her zaman `max-image-preview:large` ekler (Google Discover/görsel önizleme için); `seo.noindex`/`seo.nofollow` alanlarını yansıtır.

## 2. Preview build'lerde tam noindex

`src/lib/seo.ts#isPreviewBuild()` ve `astro.config.mjs#resolveIsProduction()` şu mantığı paylaşır:

1. `PUBLIC_BUILD_ENV` açıkça `production`/`preview`/`development` ise onu kullan.
2. Yoksa, `CF_PAGES` + `CF_PAGES_BRANCH` varsa: yalnızca `main` dalı production sayılır.
3. Hiçbiri yoksa production varsayılır (yerel `pnpm build` gibi).

Preview olarak tespit edilen her build'de: **tüm sayfalarda** `robots: noindex,nofollow` zorlanır (`resolvePageRobots`) **ve** `robots.txt` tüm botları engeller (`Disallow: /`) — bkz. `scripts/generate-robots.mjs`. Bu, önizleme/staging dağıtımlarının yanlışlıkla indexlenmesini engeller.

## 3. Sitemap kuralları

`@astrojs/sitemap`, `astro.config.mjs` içindeki `sitemapFilter()` fonksiyonuyla filtrelenir:

- Preview build'de sitemap tamamen boştur.
- `/arama/`, `/404/`, `/404.html`, `/etiket/` (bare index) her zaman hariç tutulur.
- Her etiket alt sayfası (`/etiket/<etiket>/`) yalnızca o etiketin **≥3 yayınlanmış** içeriği varsa dahil edilir (`getQualifyingTagSlugs()`, bkz. `src/lib/tag-sitemap-rules.mjs`).
- Front-matter'da `seo.noindex: true` işaretli herhangi bir içerik (`getNoindexContentPaths()`) sitemap'ten çıkarılır — bu, bölge analizlerinin `locationRef` üzerinden hesaplanan gerçek URL'si dahil, tüm koleksiyonlar için geçerlidir.
- `status: draft` içerikler zaten Astro Content Layer sorgularında hiç görünmediğinden ayrıca filtrelemeye gerek yoktur.

`robots.txt`, bu sayfaları **`Disallow` ile engellemez** — yalnızca `<meta name="robots" content="noindex">` kullanır. Sebep: bir sayfayı `Disallow` etmek taranmasını tamamen engeller, bu durumda arama motoru `noindex` etiketini hiç göremez ve sayfa açıklamasız/boş biçimde dizine girebilir. Bu kasıtlı bir tasarım kararıdır.

## 4. JSON-LD (yapılandırılmış veri)

`src/lib/schema.ts` şu şema türlerini üretir; hiçbiri görünür içerikten bağımsız veri **uydurmaz**:

| Şema                       | Nerede                          | Not                                                                                                                                                          |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Organization` + `WebSite` | Her sayfa (`BaseLayout`)        | Site geneli, `site.json`/`site-content.json`'dan                                                                                                             |
| `BreadcrumbList`           | Her sayfa (`Breadcrumbs.astro`) | Görünür breadcrumb ile birebir                                                                                                                               |
| `Article`                  | Her içerik sayfası              | `datePublished`/`dateModified`/`author` görünür verilerle birebir                                                                                            |
| `Person`                   | Yazar sayfaları                 | Yalnızca doldurulmuş alanlar dahil edilir                                                                                                                    |
| `FAQPage`                  | FAQ varsa                       | FAQ boşsa `buildFaqSchema` `null` döner — **boş/sahte FAQPage asla üretilmez**                                                                               |
| `Place`                    | Bölge analizleri                | Yalnızca bilinen konum hiyerarşisi kullanılır; **koordinat (`geo`) asla uydurulmaz** — konum verisinde koordinat yoktur, bu yüzden şema bu alanı hiç içermez |

## 5. AEO (Answer Engine Optimization)

- Her rehber/analiz, mümkün olan yerde bir **Doğrudan Cevap** (`quickAnswer`) ile açılır — okuyucu ve cevap motorları (Google AI Overviews, Bing Copilot vb.) ilk paragrafta net bir cevap bulur.
- **Önemli noktalar** (`keyTakeaways`), **Sık sorulan sorular** (FAQ) ve **Kaynaklar** listesi, hem insan okuyucu hem de metin çıkarımı yapan sistemler için yapılandırılmış, taranabilir bir format sağlar.
- İçerik içi `[[source:key]]` atıfları, her iddiayı doğrulanabilir bir kaynağa bağlar (bkz. `CONTENT_GUIDE_TR.md`).

## 6. GEO (Generative Engine Optimization) ve AI botları

### `llms.txt`

`src/pages/llms.txt.ts`, sitenin ne olduğunu, hangi içerik türlerini yayımladığını ve önemli sayfaların bağlantılarını düz metin olarak özetler (bkz. [llmstxt.org](https://llmstxt.org) taslağı). Bu dosya statik olarak üretilir, elle düzenlenmez.

### Arama botları ile eğitim botları ayrımı

`robots.txt` üç ayrı `User-agent` bloğu içerir ve bunlar **birbirinden bağımsız** ortam değişkenleriyle kontrol edilir:

| Ortam değişkeni           | Etkilediği bot                                                                              | Varsayılan        |
| ------------------------- | ------------------------------------------------------------------------------------------- | ----------------- |
| `ALLOW_SEARCH_CRAWLERS`   | Genel botlar (`User-agent: *`) + `OAI-SearchBot` (ChatGPT arama sonuçlarında görünmek için) | `true` (izinli)   |
| `ALLOW_TRAINING_CRAWLERS` | `GPTBot` (OpenAI'nin model eğitimi için içerik toplayan botu)                               | `false` (engelli) |

Bu ayrım bilinçlidir: sitenin arama sonuçlarında/AI özetlerinde görünmesi ile içeriğinin model eğitiminde kullanılmasına izin vermek farklı kararlardır. Her ikisini de `.env` üzerinden bağımsız olarak açıp kapatabilirsiniz.

## 7. IndexNow

`INDEXNOW_ENABLED=true` ve geçerli bir `INDEXNOW_KEY` tanımlıysa, `pnpm indexnow:submit` (`scripts/submit-indexnow.mjs`) son git commit'i ile karşılaştırarak **değişen** içerik URL'lerini tespit eder ve destekleyen arama motorlarına (Bing, vb.) bildirir. Anahtar veya etkinleştirme eksikse script sessizce hiçbir şey yapmadan çıkar (güvenli varsayılan). Anahtar üretmek için: `pnpm indexnow:key`.

## 8. Arama motoru doğrulama (Search Console / Bing)

`PUBLIC_GOOGLE_SITE_VERIFICATION` ve `PUBLIC_BING_SITE_VERIFICATION` ortam değişkenlerine gerçek doğrulama kodunuzu girdiğinizde, ilgili `<meta name="google-site-verification">` / `<meta name="msvalidate.01">` etiketleri otomatik olarak `<head>`'e eklenir (`BaseLayout.astro`). Değişken boşsa etiket hiç render edilmez.

Kurulum adımları:

1. [Google Search Console](https://search.google.com/search-console) → mülk ekle → "HTML etiketi" doğrulama yöntemini seçin → verilen `content` değerini `PUBLIC_GOOGLE_SITE_VERIFICATION` olarak ayarlayın.
2. [Bing Webmaster Tools](https://www.bing.com/webmasters) için aynı adımları `PUBLIC_BING_SITE_VERIFICATION` ile tekrarlayın.
3. Yeniden dağıtın; site canlıya çıktıktan sonra Search Console/Bing panelinden doğrulamayı tamamlayın ve sitemap'i (`https://konutarsa.com/sitemap-index.xml`) gönderin.

## 9. RSS

`src/pages/rss.xml.ts`, tüm koleksiyonlardaki yayınlanmış içerikleri tarihe göre sıralayarak standart bir RSS 2.0 akışı üretir (`@astrojs/rss`). Taslaklar dahil edilmez.

## 10. Yerel doğrulama komutları

```bash
pnpm build              # robots.txt + ads.txt + _headers + sitemap + RSS + llms.txt üretimini içerir
pnpm links:check        # dist/ içindeki iç bağlantıları tarar
cat dist/robots.txt      # üretilen robots.txt'yi kontrol edin
cat dist/sitemap-index.xml
```
