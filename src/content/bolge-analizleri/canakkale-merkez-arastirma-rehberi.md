---
title: 'GELİŞTİRME ÖRNEĞİ — Çanakkale Merkez Araştırma Rehberi (Taslak)'
status: 'draft'
author: 'ilkay-kaya'
publishedAt: 2026-07-25
excerpt: 'Bu içerik, bölge analizi şemasını ve locationRef doğrulamasını test etmek amacıyla oluşturulmuş bir GELİŞTİRME ÖRNEĞİDİR. Taslak durumdadır, yayımlanmamıştır ve üretim sitesinde görünmez.'
quickAnswer: 'Bu bir şema testi taslağıdır. Gerçek bir bölge analizi yayımlanmadan önce; güncel imar durumu, resmî kurum verileri ve yerinde araştırmaya dayalı özgün bir değerlendirme ile doldurulmalıdır.'
keyTakeaways:
  - 'Bu içerik yalnızca içerik şemasını ve build sürecini test etmek amacıyla oluşturulmuştur.'
  - 'Taslak (draft) durumundadır; sitemap, RSS, arama ve üretim listelerinde görünmez.'
  - 'Gerçek yayın öncesinde tüm alanlar özgün, kaynaklı ve güncel bilgiyle doldurulmalıdır.'
coverImage: '/uploads/images/bolge-analizi-kapak-m4n5o6.jpg'
coverAlt: 'Koyu lacivert zemin üzerinde konum işareti (pin) çizimi, KonutArsa bölge analizleri kapak görseli'
tags: ['gelistirme-ornegi', 'sema-testi']
locationRef: 'district:canakkale/merkez'
locationScope: 'district'
propertyFocus: 'mixed'
riskLevel: 'Veri yetersiz'
investmentHorizon: 'Veri yetersiz'
methodology: 'GELİŞTİRME ÖRNEĞİ: Bu taslak, gerçek saha araştırması veya veri toplama içermez; yalnızca content.config.ts şemasının ve locationRef doğrulamasının build sürecinde doğru çalıştığını test etmek amacıyla oluşturulmuştur.'
sources:
  - key: 'tkgm-parsel-ornek'
    organization: 'Tapu ve Kadastro Genel Müdürlüğü (TKGM)'
    title: 'Parsel Sorgulama Uygulaması'
    url: 'https://parselsorgu.tkgm.gov.tr/'
    official: true
    note: 'Şema testinde kaynak listesi bileşenini doğrulamak için örnek kaynak.'
---

## Bu bir geliştirme örneğidir

Bu sayfa **taslak (draft)** durumundadır ve yalnızca `bolge-analizleri` koleksiyonunun şemasını, `locationRef` doğrulamasını ve build sürecini test etmek amacıyla oluşturulmuştur. Taslak içerikler production build'e dahil edilmez, sitemap'e, RSS'e veya arama indeksine eklenmez.

Gerçek bir bölge analizi yayımlanmadan önce:

- Güncel imar durumu ve resmî kurum verileri araştırılmalı,
- Özgün bir editoryal değerlendirme yazılmalı,
- Kesinlik iddia eden ifadelerden ("kesin kazandırır" vb.) kaçınılmalı,
- En az iki kaynak eklenmelidir.

Bu taslak, bu koşullar sağlanmadan asla `status: published` olarak işaretlenmemelidir.
