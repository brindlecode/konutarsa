# Güvenlik ve Gizlilik Kılavuzu

## 1. Genel mimari nedeniyle düşük saldırı yüzeyi

KonutArsa tamamen statik bir site olarak inşa edilmiştir: sunucu tarafı kod çalıştırma, veritabanı, oturum/kimlik doğrulama sistemi veya kullanıcı girişi formu **yoktur**. Bu, tipik OWASP Top 10 kategorilerinin birçoğunu (SQL injection, oturum ele geçirme, sunucu tarafı RCE vb.) mimari olarak devre dışı bırakır. Kalan gerçek yüzeyler: istemci tarafı script'ler (XSS), üçüncü taraf entegrasyonları (AdSense/Analytics) ve yayın/dağıtım güvenliğidir.

## 2. Content-Security-Policy (CSP) ve güvenlik başlıkları

`public/_headers`, her build'de `scripts/generate-headers.mjs` tarafından **yeniden üretilir** (elle düzenlenmez). Varsayılan (AdSense/Analytics kapalıyken) CSP:

```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
img-src 'self' data:
font-src 'self'
connect-src 'self'
frame-src 'none'
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
object-src 'none'
```

Ayrıca: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`.

**`script-src` hiçbir zaman `'unsafe-inline'` veya `'unsafe-eval'` içermez.** Bu, tüm istemci tarafı script'lerin (GA4 yükleyici, AdSense onay script'i, arama, konum bulucu, mobil menü, paylaşım butonları) `is:inline` satır içi `<script>` yerine ya derlenmiş harici modüller ya da `public/scripts/` altında CSP-uyumlu, aynı-origin düz `.js` dosyaları olarak yazılmasını gerektirmiştir (bkz. `public/scripts/ga-loader.js`, `adsense-push.js`).

`style-src` için `'unsafe-inline'` **bilinçli bir istisnadır**: Astro, bileşen bazlı `<style>` bloklarını bazen sayfa içine gömer. Bu yalnızca CSS enjeksiyonuna izin verir, script çalıştırmaya değil; yaygın kabul gören bir ödünleşimdir.

AdSense, GA4 veya Cloudflare Web Analytics **yalnızca ilgili ortam değişkenleri gerçek bir değerle tanımlıyken**, CSP'ye o hizmetin gerektirdiği belirli resmî alan adları eklenir (örn. AdSense etkinse `pagead2.googlesyndication.com`). Bu değişkenler tanımlı değilken CSP'de bu alan adları **hiç yer almaz**.

## 3. Sırlar ve ortam değişkenleri

- `.env` dosyası `.gitignore` içindedir ve **hiçbir zaman** commit edilmemelidir.
- `.env.example`, yalnızca alan adlarını ve örnek/placeholder değerleri içerir — gerçek bir gizli anahtar/kimlik içermez.
- Bu projedeki tüm ortam değişkenleri (`PUBLIC_` önekli olanlar dahil) yayıncı düzeyinde tanımlayıcılardır (AdSense publisher ID, GA measurement ID gibi) — API gizli anahtarı (secret key) niteliğinde değildir ve zaten build-time'da istemciye gömülür. Yine de bunları asla depoya commit etmeyin; Cloudflare Pages ortam değişkenleri üzerinden yönetin.
- `INDEXNOW_KEY`, teknik olarak gizli olmasa da (URL'de kullanılır) yine de yalnızca ortam değişkeni olarak tutulur.

## 4. `security.txt`

`public/.well-known/security.txt` (RFC 9116), bir güvenlik açığı bildirmek isteyenler için iletişim kanalı sağlar. Şu anda `Contact: https://konutarsa.com/iletisim/` (gerçek bir sayfa bağlantısı) kullanır — **sahte bir e-posta adresi yazılmamıştır**. Gerçek bir güvenlik e-postası oluşturulduğunda bu dosya güncellenebilir.

## 5. Çerez ve onay (consent) mekanizması

- Analytics ve reklam sistemleri **varsayılan kapalıdır**; kapalıyken hiçbir çerez bildirimi gösterilmez ve hiçbir üçüncü taraf script'i yüklenmez.
- Bunlardan biri etkinleştirildiğinde `ConsentBanner.astro` render edilir; tercih `localStorage` (`konutarsa-consent` anahtarı) içinde saklanır ve `konutarsa:consent-updated` olayı ile ilgili script'lere (GA4 yükleyici vb.) bildirilir.
- Kullanıcı "Yalnızca zorunlu"yu seçerse GA4/AdSense **hiç yüklenmez**; yalnızca "Kabul et" seçilirse yüklenir.
- ⚠️ Bu banner **sertifikalı bir CMP (Consent Management Platform) değildir**. AB/EEA ziyaretçilerine gerçekten reklam gösterilecekse, canlıya çıkmadan önce Google'ın güncel Consent Mode/CMP gereksinimleri resmî dokümantasyondan doğrulanmalı ve gerekirse kayıtlı bir CMP entegre edilmelidir (bkz. `ADSENSE_SETUP_TR.md` §6).

## 6. Analytics olaylarında kişisel veri yasağı

`src/lib/analytics.ts`, izin verilen olay isimlerini (`article_view`, `internal_search`, `search_result_click`, `share_click`, `outbound_source_click`, `direct_ad_click`, `related_content_click`) sabit bir listeyle sınırlar ve kaynak kodundaki not açıkça belirtir: **kişisel veri, e-posta, tam IP veya hassas form verisi bu olaylara asla eklenmemelidir.**

## 7. Veri sorumlusu / iletişim bilgileri — doldurulması gereken alanlar

`src/data/site-content.json` içinde, gerçek bilgi girilene kadar **kasıtlı olarak placeholder** bırakılmış alanlar vardır:

```json
{
  "organization": {
    "legalName": "[ŞİRKET VEYA YAYINCI BİLGİSİ]",
    "contactEmail": "[İLETİŞİM E-POSTASI]",
    "address": "[ADRES]",
    "dataControllerInfo": "[VERİ SORUMLUSU BİLGİSİ]"
  }
}
```

Bu alanlar `/gizlilik-politikasi/`, `/iletisim/` ve `Organization` JSON-LD şemasında kullanılır. **Site canlıya alınmadan önce gerçek bilgilerle doldurulmalıdır** — bkz. nihai rapordaki "açık kalan noktalar" listesi. Bu doküman veya kod, bu alanları gerçek görünen ama uydurma bir değerle **doldurmaz**; bu, kullanıcıyı yanıltacak sahte bir hukuki/iletişim bilgisi oluşturmak anlamına gelirdi.

## 8. Yasal uyum notu

`/gizlilik-politikasi/` ve `/cerez-politikasi/` sayfaları, sitenin teknik olarak ne yaptığını (hangi veri, ne zaman, hangi koşulda toplanır) doğru biçimde açıklar. Ancak bu sayfalar ve bu doküman **hukuki danışmanlık yerine geçmez**. KVKK (6698 sayılı Kanun) ve/veya GDPR kapsamında tam uyumluluk (aydınlatma metni, açık rıza metni detayları, veri sorumlusu sicili vb.) için canlıya çıkmadan önce bir hukuk danışmanına başvurulması önerilir.

## 9. Bağımlılık güvenliği

Bağımlılıklar `pnpm-lock.yaml` ile kilitlenmiştir. CI iş akışı (`.github/workflows/ci.yml`) her çalıştırmada `--frozen-lockfile` ile kurulum yapar; bu, kilitlenmemiş/beklenmeyen bir sürümün sessizce sisteme girmesini engeller. Bağımlılık güncellemeleri (`pnpm update`) bilinçli, ayrı bir adım olarak yapılmalı ve sonrasında tam test paketi (`pnpm test && pnpm test:e2e`) çalıştırılmalıdır.
