# Cloudflare Pages Dağıtım Kılavuzu

KonutArsa tamamen statik bir Astro sitesidir; sunucu tarafı çalışma zamanı, veritabanı veya adaptör gerektirmez. Bu doküman, siteyi Cloudflare Pages üzerinde yayınlamak için gereken adımları açıklar.

## 1. Cloudflare Pages proje ayarları

Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** ile bu depoyu bağlayın, ardından derleme ayarlarını şu şekilde yapılandırın:

| Ayar                   | Değer                                  |
| ---------------------- | -------------------------------------- |
| Framework preset       | Astro (varsa) veya "None"              |
| Build command          | `pnpm build`                           |
| Build output directory | `dist`                                 |
| Root directory         | `/` (depo kökü)                        |
| Production branch      | `main` **(bkz. aşağıdaki önemli not)** |

### Node.js sürümü

`package.json` içindeki `engines.node` alanı `>=22.12.0` gerektirir (proje, Node'un yerleşik TypeScript tip-temizleme özelliğine dayanır). Cloudflare Pages'in build ortamında bunu garanti altına almak için proje ayarlarında bir **environment variable** olarak `NODE_VERSION=22` ekleyin.

### ⚠️ Production branch adı hakkında önemli not

Build script'leri (`astro.config.mjs`, `scripts/generate-robots.mjs`), `PUBLIC_BUILD_ENV` elle ayarlanmadığı sürece, Cloudflare'ın otomatik sağladığı `CF_PAGES_BRANCH` değerinin **tam olarak `"main"`** olup olmadığına bakarak production/preview ayrımı yapar:

```js
if (cfPages && cfBranch) return cfBranch === 'main';
```

Bu nedenle:

- Cloudflare Pages projenizin **Production branch** ayarı `main` ise ek bir işlem gerekmez.
- Production branch'iniz farklı bir isimdeyse (örn. `production`), **Production ortamı** için proje ayarlarından `PUBLIC_BUILD_ENV=production` ortam değişkenini elle tanımlayın; aksi hâlde site yanlışlıkla "preview" olarak derlenir ve tamamen `noindex` + `robots.txt: Disallow: /` ile yayınlanır.
- Tüm önizleme (preview) dağıtımları için ekstra bir şey yapmanıza gerek yoktur — bu dağıtımlar zaten otomatik olarak noindex'lenir (bkz. `SEO_OPERATIONS_TR.md` §2).

## 2. Ortam değişkenleri

Aşağıdaki tüm değişkenler `.env.example` dosyasında örneklenmiştir. Cloudflare Pages projesinin **Settings → Environment variables** bölümünde, gerçek değerleri yalnızca **Production** ortamına (ve isterseniz ayrıca Preview'a) girin — hiçbirini kod deposuna commit etmeyin.

| Değişken                                                                   | Zorunlu mu?               | Açıklama                                                                              |
| -------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| `PUBLIC_SITE_URL`                                                          | Önerilir                  | `https://konutarsa.com` (sonunda `/` olmadan)                                         |
| `PUBLIC_BUILD_ENV`                                                         | Yukarıdaki nota bakın     | `production` / `preview` / `development`                                              |
| `PUBLIC_ADSENSE_ENABLED`, `PUBLIC_ADSENSE_CLIENT`, `PUBLIC_ADSENSE_SLOT_*` | Hayır (varsayılan kapalı) | Bkz. `ADSENSE_SETUP_TR.md`                                                            |
| `PUBLIC_GA_ENABLED`, `PUBLIC_GA_MEASUREMENT_ID`                            | Hayır (varsayılan kapalı) | Google Analytics 4                                                                    |
| `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`                                        | Hayır                     | Cloudflare Web Analytics (Cloudflare Dashboard → Analytics → "Add site" ile edinilir) |
| `PUBLIC_GOOGLE_SITE_VERIFICATION`, `PUBLIC_BING_SITE_VERIFICATION`         | Hayır                     | Bkz. `SEO_OPERATIONS_TR.md` §8                                                        |
| `INDEXNOW_ENABLED`, `INDEXNOW_KEY`                                         | Hayır (varsayılan kapalı) | Bkz. `SEO_OPERATIONS_TR.md` §7                                                        |
| `ALLOW_SEARCH_CRAWLERS`                                                    | Hayır                     | Varsayılan `true`                                                                     |
| `ALLOW_TRAINING_CRAWLERS`                                                  | Hayır                     | Varsayılan `false`                                                                    |

Hiçbir gizli API anahtarı (AdSense/GA dahil hepsi zaten "publisher ID" düzeyinde, gizli olmayan tanımlayıcılardır) bu projede sunucu tarafında saklanmaz; hepsi build-time'da `PUBLIC_` önekiyle istemciye gömülür.

## 3. Pages CMS entegrasyonu

İçerik editörü paneli olan [Pages CMS](https://pagescms.org), bu depoya doğrudan GitHub üzerinden bağlanan, ayrı barındırılan bir hizmettir:

1. [app.pagescms.org](https://app.pagescms.org) üzerinden GitHub hesabınızla giriş yapın.
2. Bu depoyu (ve içeriği düzenlemesine izin vereceğiniz dalı) yetkilendirin.
3. Pages CMS, depodaki `.pages.yml` dosyasını otomatik olarak okur ve paneli buna göre oluşturur — ek bir yapılandırma gerekmez.
4. Editör panelde bir içeriği kaydettiğinde Pages CMS ilgili dala doğrudan bir git commit gönderir; bu commit, Cloudflare Pages'in otomatik dağıtımını tetikler.

Editör panelinin günlük kullanımı için `EDITOR_GUIDE_TR.md`'ye bakın.

## 4. Statik dosyalar ve Cloudflare'e özgü davranış

- `public/_headers` — build sırasında `scripts/generate-headers.mjs` tarafından üretilir (güvenlik başlıkları + CSP). Cloudflare Pages bu dosyayı otomatik okur.
- `public/_redirects` — Cloudflare Pages'in yönlendirme kuralları için standart dosya.
- `dist/404.html` — Astro'nun ürettiği 404 sayfası; Cloudflare Pages eşleşmeyen yollarda bunu otomatik olarak 404 durum koduyla sunar.
- `/generated/images/*` ve `/_astro/*` için `_headers` içinde 1 yıllık `immutable` önbellek başlığı tanımlıdır (içerik-hash'li dosya adları kullanıldığından güvenlidir).

## 5. Özel alan adı

Cloudflare Pages projesi → **Custom domains** → `konutarsa.com` (ve `www.konutarsa.com` yönlendirmesi isteniyorsa) ekleyin. DNS, alan adı Cloudflare'de yönetiliyorsa otomatik yapılandırılır.

## 6. Yayın öncesi son kontrol

```bash
pnpm install --frozen-lockfile
pnpm locations:import
pnpm build
pnpm test
pnpm test:e2e
```

Tüm bu komutlar hatasız tamamlanmadan production'a dağıtım yapılmamalıdır (bkz. kök dizindeki CI iş akışı, `.github/workflows/ci.yml`, aynı adımları otomatik çalıştırır).
