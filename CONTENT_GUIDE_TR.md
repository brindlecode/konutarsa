# İçerik Kılavuzu

Bu doküman, içerik şemasını (`src/content.config.ts`) ve editoryal kalite kurallarını teknik/editoryal sorumlular için açıklar. Panel kullanımı için `EDITOR_GUIDE_TR.md` yeterlidir; bu dosya şemanın "neden" böyle olduğunu ve doğrulama kurallarının tam listesini içerir.

## 1. Temel ilke: Uydurma yok

Bu platformda **hiçbir zaman** şunlar üretilmez:

- Sahte gayrimenkul verisi, fiyat, istatistik
- Sahte veya doğrulanmamış kaynak
- Yazarların sahip olmadığı unvan/uzmanlık/sertifika
- Sahte kullanıcı yorumu veya değerlendirmesi
- Sahte sponsor
- Lorem ipsum veya "yer tutucu" metin yayınlanmış içerikte
- Sahte AdSense/Analytics kimliği, sahte e-posta

Gerçek bilgi yoksa alan boş bırakılır veya (varsa) "veri yetersiz" seçeneği kullanılır. Bu kural şema doğrulamasından daha üsttedir: şema bir alanı zorunlu kılmıyor diye veri uydurmak asla kabul edilemez.

## 2. Koleksiyonlar

Tüm koleksiyonlar `src/content/<koleksiyon>/*.md` altında YAML front-matter + Markdown gövde olarak tutulur ve Astro Content Layer (`glob` loader) ile okunur. Şema `src/content.config.ts` içindedir.

| Koleksiyon         | Rota                                                        | Konum bağlı mı?          | Ek zorunlu alan (yayında)    |
| ------------------ | ----------------------------------------------------------- | ------------------------ | ---------------------------- |
| `konut-rehberi`    | `/konut-rehberi/<slug>/`                                    | Hayır                    | `quickAnswer`                |
| `arsa-rehberi`     | `/arsa-rehberi/<slug>/`                                     | Hayır                    | `quickAnswer`                |
| `bolge-analizleri` | konum hiyerarşisine göre (bkz. `LOCATION_DATA_GUIDE_TR.md`) | **Evet** (`locationRef`) | `quickAnswer`, `methodology` |
| `mevzuat`          | `/mevzuat/<slug>/`                                          | Hayır                    | —                            |
| `piyasa-raporlari` | `/piyasa-raporlari/<slug>/`                                 | Hayır                    | `methodology`                |
| `guncel`           | `/guncel/<slug>/`                                           | Hayır                    | —                            |
| `sozluk`           | `/sozluk/<slug>/`                                           | Hayır                    | `whyItMatters`               |
| `authors`          | `/yazarlar/<slug>/`                                         | —                        | —                            |

## 3. Ortak şema (`commonFields`)

Aşağıdaki alanlar `konut-rehberi`, `arsa-rehberi`, `bolge-analizleri`, `mevzuat`, `piyasa-raporlari`, `guncel` koleksiyonlarının tamamında bulunur:

```
title            string, zorunlu
slug             string, opsiyonel (boşsa dosya adından türetilir; bkz. src/lib/slug.ts)
status           'draft' | 'published', varsayılan 'draft'
author           authors koleksiyonuna referans, zorunlu
reviewedBy       authors koleksiyonuna referans, opsiyonel
publishedAt      tarih, opsiyonel (published için zorunlu, gelecek olamaz)
updatedAt        tarih, opsiyonel (publishedAt'ten önce olamaz)
excerpt          string, max 240 karakter (published için zorunlu)
quickAnswer      string, opsiyonel (bazı koleksiyonlarda published için zorunlu)
keyTakeaways     string[], 3-7 öğe
coverImage       string (published için zorunlu)
coverAlt         string (published için zorunlu)
coverCaption     string, opsiyonel
tags             string[], en fazla 8
sources          SourceItem[] (bkz. aşağıda)
faq              { question, answer }[]
methodology      string, opsiyonel (bazı koleksiyonlarda published için zorunlu)
corrections      { date, description }[]
seo              { titleOverride?, descriptionOverride?, canonicalOverride?, noindex?, nofollow?, ogImageOverride? }
social           { shortCaption?, longCaption?, hashtags? }
sponsorship      { sponsored?, sponsorName?, disclosure? } — sponsored=true ise diğer ikisi zorunlu
```

`SourceItem`: `{ key (küçük harf/rakam/tire), organization, title, url (http/https), publishedAt?, accessedAt?, official?, note? }`.

## 4. `bolge-analizleri`'ne özgü alanlar

```
locationRef          string, zorunlu — src/lib/locations.ts#isValidLocationRef ile doğrulanır
locationScope         'province' | 'district' | 'neighborhood' | 'custom-area', zorunlu
customLocationLabel   string — yalnızca locationScope === 'custom-area' iken zorunlu
propertyFocus         'housing' | 'land' | 'mixed', zorunlu
riskLevel             'Düşük' | 'Düşük-Orta' | 'Orta' | 'Orta-Yüksek' | 'Yüksek' | 'Veri yetersiz'
investmentHorizon     'Kısa vadeli' | 'Orta vadeli' | 'Uzun vadeli' | 'Veri yetersiz'
```

`riskLevel`/`investmentHorizon` doldurulurken gerçek bir analize dayanmıyorsa **"Veri yetersiz"** seçilmelidir — rastgele bir seviye seçmek uydurma veri sayılır.

## 5. `sozluk`'a özgü alanlar

```
definition       string, min 20 karakter, zorunlu — açık/sade tanım
usageExample     string, opsiyonel
whyItMatters     string — published için zorunlu ("neden önemli?")
relatedRisk      string, opsiyonel
relatedGuides    string[], opsiyonel — ilişkili rehberlerin slug'ları
```

Sözlük maddeleri kasıtlı olarak kısa tutulabilir, ancak ince/otomatik üretilmiş görünen (tek cümlelik, bağlamsız) madde yayınlanmamalıdır — bkz. §7 (ince içerik politikası).

## 6. Taslak/Yayın doğrulama katmanları

Doğrulama iki bağımsız katmanda uygulanır ve ikisi de aynı kuralları kullanır:

1. **`src/content.config.ts`** içindeki Zod `superRefine` kontrolleri — build sırasında (`astro check`/`astro build`) çalışır, `status: draft` içerikleri kontrolden muaf tutar.
2. **`scripts/validate-content.mjs`** (`pnpm content:validate`) — front-matter ve gövdeyi tarayan bağımsız bir hızlı ön kontrol; ayrıca slug/başlık/canonical çakışması, kaynak URL geçerliliği, `[[source:key]]` ↔ `sources` çapraz kontrolü, görsel boyutu ve kelime sayısı/H2 uyarıları gibi Zod şemasının kapsamadığı kontrolleri de yapar.

Her iki katman da yalnızca `status: published` içerik için zorunluluk uygular; taslaklar her zaman eksik bırakılabilir.

## 7. Etiket (tag) politikası — ince içerik önlemi

Bir etiket sayfası (`/etiket/<etiket>/`) yalnızca o etikete sahip **en az 3 yayınlanmış** içerik varsa sitemap'e dahil edilir ve index edilebilir kalır (bkz. `src/lib/tag-sitemap-rules.mjs`). Daha az içeriği olan etiket sayfaları render edilir (kırık link olmaz) ancak `noindex` kalır — bu, arama motorlarının "ince/boş" sayfaları cezalandırmasını önlemek içindir. Yeni bir etiket eklerken bunu göz önünde bulundurun; bir konuyu yalnızca 1 yazıda kullanmak yerine, o konuda birden fazla içerik planlıyorsanız tutarlı bir etiket seçin.

## 8. Konum bağlı içerik politikası

`bolge-analizleri` dışında hiçbir koleksiyon konuma bağlı değildir. **32.311 mahalle için otomatik/statik sayfa üretilmesi kesinlikle yasaktır** — konum verisi yalnızca (a) `/bolgeler/konum-bul/` aracında arama için ve (b) gerçekten yazılmış bir bölge analizinin `locationRef` alanı için kullanılır. Ayrıntı için `LOCATION_DATA_GUIDE_TR.md`'ye bakın.

## 9. Yayın öncesi editoryal kontrol listesi

- [ ] Başlık ve özet, içeriği doğru yansıtıyor mu?
- [ ] Doğrudan cevap (varsa), ilk paragrafta net bir cevap veriyor mu?
- [ ] Kullanılan her iddia/rakam gerçek bir kaynağa `[[source:key]]` ile bağlı mı?
- [ ] Kaynaklar gerçekten var olan, erişilebilir, ilgili kaynaklar mı?
- [ ] "Resmî kaynak" işareti yalnızca gerçekten resmî kurumlar için mi kullanıldı?
- [ ] Yazar/gözden geçiren bilgisi doğru mu?
- [ ] Kapak görseli alt metni görseli doğru tarif ediyor mu?
- [ ] Sponsorluk yoksa `sponsorship.sponsored` false/boş mu?
- [ ] (Bölge Analizleri) `locationRef`, Konum Bulucu'dan kopyalanmış geçerli bir referans mı?
- [ ] Sorumluluk reddi gerektiren bir iddia (yatırım tavsiyesi, kesin fiyat tahmini vb.) varsa uygun şekilde çerçevelendi mi?

## 10. Yerel doğrulama

```bash
pnpm content:validate   # front-matter + [[source:key]] + görsel/kelime kontrolleri
pnpm content:stale      # yaş eşiği + (best-effort) kaynak erişilebilirlik kontrolü
astro check             # Zod şeması dahil tam tip kontrolü
```
