import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { isValidLocationRef } from './lib/locations';
import { isValidSlug } from './lib/slug';

const SITE_HOST = 'konutarsa.com';

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isHttpsUrlOnSiteDomain(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname === SITE_HOST;
  } catch {
    return false;
  }
}

// --- Paylaşılan alt şemalar (bkz. proje gereksinimleri madde 8) ---

const sourceSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9][a-z0-9-]*$/,
      'Kaynak anahtarı küçük harf, rakam ve tire içermelidir (örn. "tkgm-parsel").'
    ),
  organization: z.string().min(1, 'Kaynak kurum/organizasyon adı zorunludur.'),
  title: z.string().min(1, 'Kaynak başlığı zorunludur.'),
  url: z.string().refine(isHttpUrl, 'Kaynak bağlantısı geçerli bir http(s) adresi olmalıdır.'),
  publishedAt: z.coerce.date().optional(),
  accessedAt: z.coerce.date().optional(),
  official: z.boolean().optional().default(false),
  note: z.string().optional(),
});

const faqItemSchema = z.object({
  question: z.string().min(5, 'Soru en az 5 karakter olmalıdır.'),
  answer: z.string().min(5, 'Cevap en az 5 karakter olmalıdır.'),
});

const correctionSchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(3, 'Düzeltme açıklaması en az 3 karakter olmalıdır.'),
});

const seoSchema = z
  .object({
    titleOverride: z.string().min(10).max(70).optional(),
    descriptionOverride: z.string().min(50).max(160).optional(),
    canonicalOverride: z
      .string()
      .optional()
      .refine(
        (value) => value === undefined || isHttpsUrlOnSiteDomain(value),
        `Canonical override yalnızca https://${SITE_HOST} alan adında geçerli bir adres olabilir.`
      ),
    noindex: z.boolean().optional().default(false),
    nofollow: z.boolean().optional().default(false),
    ogImageOverride: z.string().optional(),
  })
  .optional()
  .default({ noindex: false, nofollow: false });

const socialSchema = z
  .object({
    shortCaption: z.string().optional(),
    longCaption: z.string().optional(),
    hashtags: z.array(z.string()).optional().default([]),
  })
  .optional()
  .default({ hashtags: [] });

const sponsorshipSchema = z
  .object({
    sponsored: z.boolean().optional().default(false),
    sponsorName: z.string().optional(),
    disclosure: z.string().optional(),
  })
  .optional()
  .default({ sponsored: false });

// Zod tarafında OKUNAN ortak alanlar için gevşek bir tip: farklı koleksiyonların
// zod nesneleri yapısal olarak uyumlu olduğu sürece bu fonksiyona geçirilebilir.
interface CommonPublishableFields {
  status: 'draft' | 'published';
  title: string;
  excerpt?: string;
  coverImage?: string;
  coverAlt?: string;
  publishedAt?: Date;
  updatedAt?: Date;
  sponsorship?: { sponsored?: boolean; sponsorName?: string; disclosure?: string };
}

/**
 * Yayımlanmış (status: "published") içerik için ortak zorunluluk kurallarını
 * uygular. Taslaklar bu kontrollerden muaftır — Gamze eksik bir taslağı
 * istediği an kaydedebilmeli; eksiksizlik yalnızca yayımlama anında zorunlu
 * hâle gelir. Aynı kuralların hızlı bir CI ön-kontrolü scripts/validate-content.mjs
 * içinde de bulunur (bkz. o dosyanın başındaki not).
 */
function applyCommonPublishedChecks(data: CommonPublishableFields, ctx: z.RefinementCtx) {
  if (data.status !== 'published') return;

  if (!data.publishedAt) {
    ctx.addIssue({
      code: 'custom',
      path: ['publishedAt'],
      message: 'Yayımlanan içerikte yayın tarihi zorunludur.',
    });
  } else if (data.publishedAt.getTime() > Date.now()) {
    ctx.addIssue({
      code: 'custom',
      path: ['publishedAt'],
      message: 'Yayımlanan içerik için gelecek tarihli yayın tarihi kullanılamaz.',
    });
  }

  if (data.updatedAt && data.publishedAt && data.updatedAt.getTime() < data.publishedAt.getTime()) {
    ctx.addIssue({
      code: 'custom',
      path: ['updatedAt'],
      message: 'Güncelleme tarihi, yayın tarihinden önce olamaz.',
    });
  }

  if (!data.excerpt) {
    ctx.addIssue({
      code: 'custom',
      path: ['excerpt'],
      message: 'Yayımlanan içerikte kısa özet (excerpt) zorunludur.',
    });
  }
  if (!data.coverImage) {
    ctx.addIssue({
      code: 'custom',
      path: ['coverImage'],
      message: 'Yayımlanan içerikte kapak görseli zorunludur.',
    });
  }
  if (!data.coverAlt) {
    ctx.addIssue({
      code: 'custom',
      path: ['coverAlt'],
      message: 'Yayımlanan içerikte kapak görseli alt metni zorunludur.',
    });
  }

  if (data.sponsorship?.sponsored) {
    if (!data.sponsorship.sponsorName) {
      ctx.addIssue({
        code: 'custom',
        path: ['sponsorship', 'sponsorName'],
        message: 'Sponsorlu içerikte sponsor adı zorunludur.',
      });
    }
    if (!data.sponsorship.disclosure) {
      ctx.addIssue({
        code: 'custom',
        path: ['sponsorship', 'disclosure'],
        message: 'Sponsorlu içerikte açıklama (disclosure) metni zorunludur.',
      });
    }
  }
}

function requireQuickAnswer(data: { status: string; quickAnswer?: string }, ctx: z.RefinementCtx) {
  if (data.status === 'published' && !data.quickAnswer) {
    ctx.addIssue({
      code: 'custom',
      path: ['quickAnswer'],
      message: 'Bu içerik türünde yayımlanan içerikte "Doğrudan Cevap" (quickAnswer) zorunludur.',
    });
  }
}

function requireMethodology(data: { status: string; methodology?: string }, ctx: z.RefinementCtx) {
  if (data.status === 'published' && !data.methodology) {
    ctx.addIssue({
      code: 'custom',
      path: ['methodology'],
      message: 'Bu içerik türünde yayımlanan içerikte metodoloji açıklaması zorunludur.',
    });
  }
}

// --- Ortak alanlar (bkz. proje gereksinimleri madde 8) ---
// Not: Birçok alan burada opsiyoneldir; "zorunlu" olanlar
// applyCommonPublishedChecks ile yalnızca status: "published" için uygulanır.
const commonFields = {
  title: z.string().min(1, 'Başlık zorunludur.'),
  slug: z
    .string()
    .optional()
    .refine((value) => value === undefined || isValidSlug(value), {
      message:
        'Slug yalnızca küçük harf, rakam ve tire içermelidir (baş/son tire ve ardışık tire olmamalı).',
    }),
  status: z.enum(['draft', 'published']).default('draft'),
  author: reference('authors'),
  reviewedBy: reference('authors').optional(),
  publishedAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  excerpt: z.string().max(240).optional(),
  quickAnswer: z.string().optional(),
  keyTakeaways: z.array(z.string().min(1)).min(3).max(7).optional().default([]),
  coverImage: z.string().optional(),
  coverAlt: z.string().optional(),
  coverCaption: z.string().optional(),
  tags: z.array(z.string().min(1)).max(8).optional().default([]),
  sources: z.array(sourceSchema).optional().default([]),
  faq: z.array(faqItemSchema).optional().default([]),
  methodology: z.string().optional(),
  corrections: z.array(correctionSchema).optional().default([]),
  seo: seoSchema,
  social: socialSchema,
  sponsorship: sponsorshipSchema,
};

// --- Yazarlar ---
// Gerçek bilgi sağlanmadıkça meslek/uzmanlık/sertifika UYDURULMAZ (bkz. madde 7.8, 18.3, 47).
const authors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/authors' }),
  schema: z.object({
    name: z.string().min(1),
    role: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    email: z.string().optional(),
    credentials: z.array(z.string()).optional().default([]),
    social: z
      .object({
        website: z.string().optional(),
        linkedin: z.string().optional(),
        x: z.string().optional(),
      })
      .optional()
      .default({}),
  }),
});

// --- Konut rehberi ---
const konutRehberi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/konut-rehberi' }),
  schema: z.object({ ...commonFields }).superRefine((data, ctx) => {
    applyCommonPublishedChecks(data, ctx);
    requireQuickAnswer(data, ctx);
  }),
});

// --- Arsa rehberi ---
const arsaRehberi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/arsa-rehberi' }),
  schema: z.object({ ...commonFields }).superRefine((data, ctx) => {
    applyCommonPublishedChecks(data, ctx);
    requireQuickAnswer(data, ctx);
  }),
});

// --- Bölge analizleri (bkz. proje gereksinimleri madde 9) ---
const RISK_SCALE = [
  'Düşük',
  'Düşük-Orta',
  'Orta',
  'Orta-Yüksek',
  'Yüksek',
  'Veri yetersiz',
] as const;
const INVESTMENT_HORIZON_SCALE = [
  'Kısa vadeli',
  'Orta vadeli',
  'Uzun vadeli',
  'Veri yetersiz',
] as const;

const bolgeAnalizleri = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/bolge-analizleri' }),
  schema: z
    .object({
      ...commonFields,
      locationRef: z
        .string()
        .refine(
          isValidLocationRef,
          'Geçersiz konum referansı (locationRef). /bolgeler/konum-bul/ aracıyla doğru referansı bulun.'
        ),
      locationScope: z.enum(['province', 'district', 'neighborhood', 'custom-area']),
      customLocationLabel: z.string().optional(),
      propertyFocus: z.enum(['housing', 'land', 'mixed']),
      riskLevel: z.enum(RISK_SCALE).optional(),
      investmentHorizon: z.enum(INVESTMENT_HORIZON_SCALE).optional(),
    })
    .superRefine((data, ctx) => {
      applyCommonPublishedChecks(data, ctx);
      requireQuickAnswer(data, ctx);
      requireMethodology(data, ctx);
      if (data.locationScope === 'custom-area' && !data.customLocationLabel) {
        ctx.addIssue({
          code: 'custom',
          path: ['customLocationLabel'],
          message: 'locationScope "custom-area" olduğunda customLocationLabel zorunludur.',
        });
      }
    }),
});

// --- Mevzuat ---
const mevzuat = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/mevzuat' }),
  schema: z.object({ ...commonFields }).superRefine((data, ctx) => {
    applyCommonPublishedChecks(data, ctx);
  }),
});

// --- Piyasa raporları ---
const piyasaRaporlari = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/piyasa-raporlari' }),
  schema: z.object({ ...commonFields }).superRefine((data, ctx) => {
    applyCommonPublishedChecks(data, ctx);
    requireMethodology(data, ctx);
  }),
});

// --- Güncel içerikler ---
const guncel = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guncel' }),
  schema: z.object({ ...commonFields }).superRefine((data, ctx) => {
    applyCommonPublishedChecks(data, ctx);
  }),
});

// --- Gayrimenkul sözlüğü (bkz. madde 7.7 — otomatik/ince içerik yasak) ---
const sozluk = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sozluk' }),
  schema: z
    .object({
      ...commonFields,
      definition: z.string().min(20, 'Tanım en az 20 karakter olmalıdır.'),
      usageExample: z.string().optional(),
      whyItMatters: z.string().optional(),
      relatedRisk: z.string().optional(),
      relatedGuides: z.array(z.string()).optional().default([]),
    })
    .superRefine((data, ctx) => {
      applyCommonPublishedChecks(data, ctx);
      if (data.status === 'published' && !data.whyItMatters) {
        ctx.addIssue({
          code: 'custom',
          path: ['whyItMatters'],
          message: 'Yayımlanan sözlük maddesinde "neden önemli olduğu" alanı zorunludur.',
        });
      }
    }),
});

export const collections = {
  authors,
  'konut-rehberi': konutRehberi,
  'arsa-rehberi': arsaRehberi,
  'bolge-analizleri': bolgeAnalizleri,
  mevzuat,
  'piyasa-raporlari': piyasaRaporlari,
  guncel,
  sozluk,
};
