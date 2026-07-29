# Editör Kılavuzu (Gamze için)

Bu kılavuz, teknik bilgi gerektirmeden KonutArsa içeriğini yönetebilmeniz için yazıldı. İçerik paneline (Pages CMS) girdiğinizde göreceğiniz her bölüm burada açıklanıyor. Karşılaştığınız hiçbir teknik terim (JSON-LD, canonical, sitemap, robots, build, git, API anahtarı vb.) için endişelenmenize gerek yok — bunların hiçbiri panelde size gösterilmez ve hiçbirine dokunmanız gerekmez.

## 1. Panele giriş

İçerik panelinin adresi ve giriş bilgileriniz proje sorumlunuz tarafından size ayrıca iletilecektir (Pages CMS, GitHub hesabınızla giriş yaptığınız barındırılan bir hizmettir — konutarsa.com'un kendisi değildir). Giriş yaptığınızda solda şu bölümleri göreceksiniz:

- **Konut Rehberi, Arsa Rehberi, Bölge Analizleri, Mevzuat, Piyasa Raporları, Güncel, Gayrimenkul Sözlüğü** — içerik türleri
- **Yazarlar** — yazar/editör profilleri
- **Reklamlar, Site Ayarları, Sosyal Medya** — tek dosyalık ayar ekranları

## 2. Genel iş akışı: Taslak → Yayın

Her içeriğin bir **Yayın durumu** alanı vardır: `draft` (taslak) veya `published` (yayında).

- **draft** iken içerik sitede **hiç görünmez** — ne ana sayfada, ne kategori sayfasında, ne site içi aramada, ne de Google gibi arama motorlarında. İstediğiniz kadar eksik/yarım bırakıp kaydedebilirsiniz.
- **published** yaptığınız anda birkaç alan **zorunlu hâle gelir** (aşağıda "Yayınlarken nelere dikkat edilir?" bölümüne bakın). Eksik bir zorunlu alan varsa panel sizi uyarır; o alanı doldurmadan yayına alamazsınız.

**Öneri:** Bir içeriği yazarken durumunu `draft` bırakın, tamamlandığında son kontrolü yapıp `published` olarak değiştirin.

## 3. Ortak alanlar (çoğu içerik türünde aynı)

| Alan                                 | Ne işe yarar                                                    | Notlar                                                                                                                             |
| ------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Başlık                               | Sayfanın ana başlığı (H1)                                       | 15-100 karakter arası önerilir, benzersiz olmalı                                                                                   |
| URL kısa adı (slug)                  | Sayfanın adresi (örn. `/konut-rehberi/kat-mulkiyeti-nedir/`)    | Boş bırakırsanız dosya adından otomatik oluşturulur; genelde boş bırakmanız yeterli                                                |
| Kısa özet                            | Liste kartlarında ve arama sonuçlarında görünen özet            | 100-240 karakter                                                                                                                   |
| Doğrudan cevap                       | Yazının başında sorunun net cevabı                              | Okuyucunun (ve Google/AI özetlerinin) tek paragrafta cevabı görmesi için önemli                                                    |
| Önemli noktalar                      | 3-7 kısa madde                                                  | Yazının en can alıcı noktalarının listesi                                                                                          |
| Kapak görseli / alt metin / alt yazı | Yazının kapak fotoğrafı                                         | Alt metin, görseli göremeyen kullanıcılar ve arama motorları için görselin ne olduğunu anlatan kısa açıklamadır — mutlaka doldurun |
| İçerik gövdesi                       | Yazının kendisi                                                 | Aşağıdaki "Kaynak gösterme" bölümüne bakın                                                                                         |
| Kaynaklar                            | Yazıda kullandığınız resmî/güvenilir kaynaklar                  | Aşağıda ayrıntılı anlatılıyor                                                                                                      |
| Sık sorulan sorular                  | Soru-cevap listesi                                              | Varsa ekleyin, yoksa boş bırakabilirsiniz                                                                                          |
| Yazar / Gözden geçiren editör        | İlgili kişiyi "Yazarlar" listesinden seçersiniz                 | Gerçek olmayan bir unvan asla yazmayın                                                                                             |
| Yayın tarihi / Güncelleme tarihi     |                                                                 | Yayın tarihi geleceğe ayarlanamaz                                                                                                  |
| Metodoloji                           | Verinin/analizin nasıl hazırlandığının kısa açıklaması          | Bazı içerik türlerinde zorunludur                                                                                                  |
| Düzeltme geçmişi                     | İçerikte önemli bir hata düzeltildiyse tarih + açıklama ekleyin | Şeffaflık için                                                                                                                     |
| Etiketler                            | En fazla 8 kısa konu etiketi                                    |                                                                                                                                    |
| Sosyal medya metinleri               | Paylaşım için kısa/uzun metin ve hashtag                        | İsteğe bağlı                                                                                                                       |
| Sponsor bilgileri                    | İçerik gerçekten sponsorluysa doldurun                          | Aşağıya bakın                                                                                                                      |
| **Gelişmiş SEO**                     |                                                                 | **Bu bölümü genellikle hiç açmayın, boş bırakın** — teknik ekip gerektiğinde kullanır                                              |

## 4. Kaynak gösterme: `[[source:anahtar]]`

İçerik gövdesinde bir bilgiyi kaynağa bağlamak için, "Kaynaklar" listesine eklediğiniz kaydın **Kaynak anahtarı**nı metin içinde şu şekilde kullanın:

```
Tapu harcı, satış bedeli üzerinden hesaplanır [[source:tkgm-harc]].
```

Bu otomatik olarak numaralı bir dipnot bağlantısına dönüşür ve yazının sonundaki "Kaynaklar" listesine bağlanır. Kaynak anahtarı yalnızca küçük harf, rakam ve tire içerebilir (örn. `tkgm-harc`, `mevzuat-634`).

**Önemli:** Sadece gerçekten var olan, kontrol ettiğiniz kaynakları ekleyin. Bir kaynağı "Resmî kaynak mı?" olarak işaretlemeden önce gerçekten resmî bir kurumdan (T.C. Cumhurbaşkanlığı Mevzuat Bilgi Sistemi, TKGM, TÜİK, TCMB, ilgili bakanlık/belediye vb.) geldiğinden emin olun.

## 5. Bölge Analizleri: konum seçimi

Bölge Analizleri'nde diğerlerinden farklı olarak bir **Konum referansı** alanı vardır. Bunu elle yazmayın — sitedeki **Konum Bulucu** aracını (`/bolgeler/konum-bul/`) kullanarak il/ilçe/mahalle arayın, "Kopyala" düğmesiyle referansı kopyalayıp bu alana yapıştırın (örn. `district:canakkale/merkez`). Ayrıca **Konum kapsamı** (il / ilçe / mahalle / özel bölge) ve **Gayrimenkul odağı** (konut / arsa / karma) alanlarını da seçmeniz gerekir. Bölge Analizleri'nde **Metodoloji** alanı zorunludur — analizi nasıl hazırladığınızı kısaca açıklayın.

**Çok önemli:** Her mahalle için ayrı bir sayfa oluşturulmaz ve oluşturulmamalıdır. Bölge Analizleri yalnızca gerçekten araştırıp yazdığınız, özgün içeriğiniz olan yerler için vardır.

## 6. Sponsorlu içerik

Bir içerik gerçekten bir sponsorluk anlaşması kapsamında yayınlanıyorsa "Sponsor bilgileri" bölümünü doldurun (sponsor adı + açıklama metni). Bu, sayfada okuyucuya açıkça gösterilen bir uyarı kutusu oluşturur. Sponsorlu olmayan bir içerikte bu alanı **kesinlikle boş bırakın** — gerçek olmayan sponsorluk bilgisi eklemeyin.

Bu, "Reklamlar" (banner tipi doğrudan reklamlar) dosyasından **farklı bir sistemdir** — bkz. `DIRECT_ADS_GUIDE_TR.md`.

## 7. Görsel yükleme

"Kapak görseli" gibi görsel alanlarına tıkladığınızda bilgisayarınızdan bir görsel yükleyebilirsiniz (jpg, jpeg, png, webp). En az 1200 piksel genişlik önerilir. Yüklediğiniz her görsel için **alt metin** yazmayı unutmayın — bu hem erişilebilirlik hem de arama motorları için önemlidir.

## 8. Yazarlar

Yeni bir yazar/editör eklerken yalnızca **gerçek** bilgi girin: gerçek ad, gerçek unvan, varsa gerçek sertifika/uzmanlık. Var olmayan bir unvan veya sertifika **asla** yazılmamalıdır.

## 9. Yayınlarken nelere dikkat edilir?

Bir içeriği `published` yaptığınızda şu alanlar dolu olmalıdır (panel eksikse uyarır):

- Yayın tarihi (geçmiş veya bugün, gelecek tarih olamaz)
- Kısa özet, kapak görseli ve alt metni
- Doğrudan cevap (Konut/Arsa Rehberi, Bölge Analizleri için)
- Metodoloji (Bölge Analizleri ve Piyasa Raporları için)
- Sponsor bilgileri doldurulmuşsa hem sponsor adı hem açıklama birlikte dolu olmalı

## 10. Genel kural: Uydurmayın

Bu projenin en önemli kuralı: **hiçbir zaman sahte istatistik, fiyat, kaynak, yazar unvanı, sponsor bilgisi veya kullanıcı yorumu yazılmaz.** Elinizde gerçek/doğrulanmış bilgi yoksa o alanı boş bırakın veya "veri yetersiz" gibi seçenekleri kullanın (Bölge Analizleri'ndeki Risk/Vade alanlarında bu seçenek zaten mevcuttur). Emin olmadığınız bir konuda teknik ekiple veya proje sorumlunuzla iletişime geçin.

## 11. Bir şey ters giderse

Panel bir alanı kırmızı gösteriyorsa veya kaydetmiyor/yayınlamıyorsa, genellikle yukarıdaki zorunlu alanlardan biri eksiktir. Emin olamadığınız durumlarda içeriği `draft` olarak bırakıp teknik ekiple iletişime geçmeniz yeterlidir — hiçbir şeyi zorlamanıza gerek yok.
