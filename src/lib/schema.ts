import siteData from '../data/site.json';
import siteContentData from '../data/site-content.json';
import { SITE_URL, absoluteUrl } from './urls';
import type { ResolvedLocation } from './locations';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function buildOrganizationSchema() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: siteData.name,
    url: SITE_URL,
  };
}

export function buildWebsiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: siteData.name,
    description: siteContentData.description,
    inLanguage: siteData.language,
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export interface BreadcrumbItem {
  label: string;
  path: string;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.path),
    })),
  };
}

export interface PersonSchemaInput {
  name: string;
  slug: string;
  role?: string;
  bio?: string;
  avatar?: string;
  url?: string;
}

export function buildPersonSchema(person: PersonSchemaInput) {
  return {
    '@type': 'Person',
    '@id': `${absoluteUrl(`/yazarlar/${person.slug}`)}#person`,
    name: person.name,
    ...(person.role ? { jobTitle: person.role } : {}),
    ...(person.bio ? { description: person.bio } : {}),
    ...(person.avatar ? { image: absoluteUrl(person.avatar) } : {}),
    url: person.url ?? absoluteUrl(`/yazarlar/${person.slug}`),
  };
}

export interface ArticleSchemaInput {
  headline: string;
  description: string;
  path: string;
  image?: string;
  datePublished: Date;
  dateModified?: Date;
  author: PersonSchemaInput;
  reviewer?: PersonSchemaInput;
  section: string;
  keywords?: string[];
}

export function buildArticleSchema(input: ArticleSchemaInput) {
  const pageUrl = absoluteUrl(input.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    ...(input.image ? { image: [absoluteUrl(input.image)] } : {}),
    datePublished: input.datePublished.toISOString(),
    dateModified: (input.dateModified ?? input.datePublished).toISOString(),
    author: buildPersonSchema(input.author),
    ...(input.reviewer ? { reviewedBy: buildPersonSchema(input.reviewer) } : {}),
    publisher: { '@id': ORGANIZATION_ID },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    articleSection: input.section,
    ...(input.keywords && input.keywords.length > 0 ? { keywords: input.keywords.join(', ') } : {}),
    inLanguage: siteData.language,
    isAccessibleForFree: true,
  };
}

export interface FaqSchemaItem {
  question: string;
  answer: string;
}

export function buildFaqSchema(items: FaqSchemaItem[]) {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Yalnızca gerçekten bilinen alanları içerir — sahte koordinat veya
 * doğrulanmamış bilgi eklenmez (bkz. madde 17.3).
 */
export function buildPlaceSchema(location: ResolvedLocation) {
  const containedInPlace =
    location.type === 'neighborhood'
      ? {
          '@type': 'AdministrativeArea',
          name: location.district,
          containedInPlace: { '@type': 'AdministrativeArea', name: location.province },
        }
      : location.type === 'district'
        ? { '@type': 'AdministrativeArea', name: location.province }
        : undefined;

  return {
    '@type': 'Place',
    name: location.neighborhood ?? location.district ?? location.province,
    ...(containedInPlace ? { containedInPlace } : {}),
  };
}

export function toJsonLdScript(data: unknown): string {
  return JSON.stringify(data);
}
