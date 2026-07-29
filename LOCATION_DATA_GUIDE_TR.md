# Konum Verisi Kılavuzu

## 1. Veri kaynağı

Konum verisi, `data-source/Turkiye_Il_Ilce_Mahalle_Listesi_2026.xlsx` dosyasından `pnpm locations:import` (`scripts/import-locations.mjs`) komutuyla içe aktarılır. Bu, **gerçek** bir il/ilçe/mahalle listesidir; hiçbir kayıt uydurulmamış veya tahmin edilmemiştir. Son içe aktarımda doğrulanan rakamlar:

| Ölçüm                                | Değer                                                                                                                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| İl                                   | 81                                                                                                                                                                                                    |
| Resmî ilçe                           | 922                                                                                                                                                                                                   |
| İl merkezi (ilçe statüsünde)         | 51                                                                                                                                                                                                    |
| İlçe grubu (resmî ilçe + il merkezi) | 973                                                                                                                                                                                                   |
| Mahalle                              | 32.311                                                                                                                                                                                                |
| Tam yinelenen satır (kaynak veride)  | 11 (bkz. `src/data/locations/summary.json#duplicateExactRows` — bunlar kaynak dosyadaki gerçek yinelenen satırlardır, import script'i bunları uyarı olarak loglar ve atlamaz, benzersiz ID ile korur) |

Script, içe aktarma sonunda bu rakamları `EXPECTED` sabitiyle karşılaştırır ve uyuşmazsa **hata verip durur** — bu, veri kaynağı yanlışlıkla değişirse (örn. eksik bir sayfa/sekme) sessizce yanlış veriyle devam edilmesini engeller.

## 2. Üretilen dosyalar

```
src/data/locations/
  provinces.json           81 il özeti (ad, slug, ilçe/mahalle sayısı)
  districts.json           973 ilçe grubu özeti
  location-index.json      mahalle ID → il slug haritası (hızlı arama için)
  neighborhoods/<il-slug>.json   her il için ayrı mahalle listesi (81 dosya)
  summary.json             içe aktarım istatistikleri ve doğrulama sonucu
```

Bu dosyalar **git'e commit edilir** (üretilen ama takip edilen veri) — böylece proje klonlandığında `pnpm locations:import` çalıştırılmadan da site derlenebilir; script yalnızca kaynak xlsx güncellendiğinde yeniden çalıştırılması gerekir.

## 3. ⚠️ En önemli kural: 32.311 sayfa YOK

**Hiçbir mahalle için otomatik/statik bir HTML sayfası üretilmez.** Konum verisi yalnızca iki amaçla kullanılır:

1. **Konum Bulucu** aracı (`/bolgeler/konum-bul/`) — ziyaretçilerin ve editörlerin il/ilçe/mahalle arayıp bir "konum referansı" (`locationRef`) bulmasını sağlayan istemci tarafı bir araç.
2. **Bölge Analizleri** içeriği — yalnızca gerçekten yazılmış, özgün bir analiz varsa, o analizin `locationRef` alanı aracılığıyla bir sayfa oluşur.

Yani mahalle/ilçe/il sayısı kadar sayfa değil, **yazılan bölge analizi sayısı kadar** sayfa üretilir.

## 4. Konum referansı (`locationRef`) biçimi

`src/lib/locations.ts#parseLocationRef` üç biçimi tanır:

| Biçim                            | Örnek                       | Anlamı                                              |
| -------------------------------- | --------------------------- | --------------------------------------------------- |
| `province:<il-slug>`             | `province:canakkale`        | İl geneli                                           |
| `district:<il-slug>/<ilçe-slug>` | `district:canakkale/merkez` | İlçe geneli (il merkezleri dahil, "merkez" gibi)    |
| `neighborhood:m-XXXXXX`          | `neighborhood:m-007837`     | Tek bir mahalle (kaynak veride atanan benzersiz ID) |

`locationScope: 'custom-area'` seçildiğinde `locationRef` yine bu üç biçimden birine (genellikle en yakın il/ilçe) işaret eder; `customLocationLabel` ise bu referansın kapsadığı alan içindeki resmî bir mahalle/ilçe olmayan özel bir bölgeyi (örn. bilinen bir mevki, sit alanı, toplu konut bölgesi adı) okuyucuya göstermek için kullanılır.

`isValidLocationRef()`, bir referansın gerçekten mevcut il/ilçe/mahalle verisine karşılık gelip gelmediğini kontrol eder; geçersiz bir referans (yazım hatası, var olmayan ilçe vb.) hem `content.config.ts` (Zod) hem de build sırasında (`getStaticPaths`) hata verir — sessizce yanlış/var olmayan bir konuma bağlı sayfa oluşturulamaz.

## 5. Bölge analizi URL yapısı

Bir bölge analizinin URL'i, konum hiyerarşisinden otomatik türetilir: `/bolge-analizleri/<il-slug>/<ilçe-slug>/<yazı-slug>/` (il düzeyi referanslarda ilçe segmenti düşer). Breadcrumb da aynı hiyerarşiden otomatik oluşturulur — elle bir breadcrumb yazılmaz.

## 6. `Place` yapılandırılmış verisi

Bölge analizi sayfalarında `buildPlaceSchema()` bir `Place` JSON-LD nesnesi üretir; bu yalnızca konum verisinde **gerçekten bulunan** ad/hiyerarşi bilgisini içerir. Kaynak veride koordinat (enlem/boylam) bulunmadığından şema **`geo` alanını hiçbir zaman içermez** — bu, uydurma koordinat üretmemek için bilinçli bir tasarımdır.

## 7. Konum Bulucu aracının çalışma şekli

`/bolgeler/konum-bul/` sayfası:

1. Tüm iller (`provinces.json`) ve ilçeler (`districts.json`) sayfa yüklenirken hazır bulunur (küçük dosyalar).
2. Bir il seçildiğinde, yalnızca o ile ait mahalle dosyası (`neighborhoods/<il-slug>.json`) Vite'in `import.meta.glob` mekanizmasıyla **isteğe bağlı** olarak indirilir — 81 ilin tamamı tek seferde yüklenmez.
3. Arama, Türkçe karakter/büyük-küçük harf duyarlılığını normalize eder (`toLocaleLowerCase('tr-TR')` + Türkçe özel karakter sadeleştirmesi) ve tam eşleşme bulunamazsa Levenshtein mesafesine dayalı yazım hatası toleranslı bir yedek arama devreye girer.
4. Bulunan her sonuç için "Kopyala" düğmesi, ilgili `locationRef` değerini panoya kopyalar — bu değer doğrudan Pages CMS'teki "Konum referansı" alanına yapıştırılabilir.

## 8. Veriyi güncellemek

Kaynak xlsx değiştiğinde (örn. yeni bir yıl için TÜİK/İçişleri Bakanlığı güncellemesi):

```bash
# Yeni dosyayı data-source/ altına koyun, ardından:
pnpm locations:import
```

Script, beklenen rakamlarla (`EXPECTED`) uyuşmayan bir sonuç üretirse **hata verip durur** — bu durumda yeni veriyi elle inceleyip script'teki `EXPECTED` sabitini bilinçli olarak güncellemeniz gerekir. Değişen/yeniden adlandırılan bir ilçe, mevcut bölge analizlerinin `locationRef` değerlerini geçersiz kılabilir; içe aktarım sonrası `pnpm build` çalıştırarak bunu erken tespit edin (geçersiz bir referans build'i durdurur).
