import { getCollection, type CollectionEntry } from 'astro:content';
import { resolveLocationRef } from './locations';
import { slugify } from './slug';
import {
  type ContentCollectionName,
  type ContentSummary,
  type AuthorSummary,
  CONTENT_COLLECTIONS,
  COLLECTION_LABELS_TR,
  getEntrySlug,
  assertPublished,
  buildContentUrl,
  scoreRelatedness,
  getRelatedContent,
  getBodyWordCount,
} from './content-utils';
import { getAuthorPath } from './urls';

export {
  type ContentCollectionName,
  type ContentSummary,
  type AuthorSummary,
  CONTENT_COLLECTIONS,
  COLLECTION_LABELS_TR,
  getEntrySlug,
  assertPublished,
  scoreRelatedness,
  getRelatedContent,
  getBodyWordCount,
};

export async function getPublishedEntries<C extends ContentCollectionName>(
  collection: C
): Promise<CollectionEntry<C>[]> {
  return getCollection(collection, (entry) => entry.data.status === 'published');
}

function toContentSummary<C extends ContentCollectionName>(
  collection: C,
  entry: CollectionEntry<C>
): ContentSummary {
  assertPublished(entry.data);
  const slug = getEntrySlug(entry);

  let locationRef: string | undefined;
  let provinceSlug: string | undefined;
  let districtSlug: string | undefined;
  let locationUrlPath: string | undefined;

  if (collection === 'bolge-analizleri') {
    const locationData = entry.data as unknown as { locationRef: string };
    const resolved = resolveLocationRef(locationData.locationRef);
    if (!resolved) {
      throw new Error(`Çözülemeyen locationRef: "${locationData.locationRef}" (${entry.id}).`);
    }
    locationRef = locationData.locationRef;
    provinceSlug = resolved.provinceSlug;
    districtSlug = resolved.districtSlug;
    locationUrlPath = resolved.urlPath;
  }

  const url = buildContentUrl(collection, slug, locationUrlPath);

  const authorRef = entry.data.author as unknown as { id: string };
  const reviewerRef = entry.data.reviewedBy as unknown as { id: string } | undefined;

  return {
    collection,
    slug,
    url,
    title: entry.data.title,
    excerpt: entry.data.excerpt,
    coverImage: entry.data.coverImage,
    coverAlt: entry.data.coverAlt,
    tags: entry.data.tags ?? [],
    publishedAt: entry.data.publishedAt,
    updatedAt: entry.data.updatedAt,
    locationRef,
    provinceSlug,
    districtSlug,
    authorSlug: authorRef.id,
    reviewerSlug: reviewerRef?.id,
  };
}

/** Every published entry across all seven content collections, newest first. */
export async function getAllPublishedSummaries(): Promise<ContentSummary[]> {
  const summaries: ContentSummary[] = [];
  for (const collection of CONTENT_COLLECTIONS) {
    const entries = await getPublishedEntries(collection);
    for (const entry of entries) {
      summaries.push(toContentSummary(collection, entry));
    }
  }
  return summaries.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export function toAuthorSummary(entry: CollectionEntry<'authors'>): AuthorSummary {
  const slug = entry.id;
  return {
    slug,
    name: entry.data.name,
    role: entry.data.role,
    bio: entry.data.bio,
    avatar: entry.data.avatar,
    url: getAuthorPath(slug),
  };
}

/** Tag counts across all published content, used for archive-page thin-tag detection. */
export async function getTagCounts(): Promise<Map<string, { count: number; label: string }>> {
  const summaries = await getAllPublishedSummaries();
  const counts = new Map<string, { count: number; label: string }>();
  for (const summary of summaries) {
    for (const tag of summary.tags) {
      const tagSlug = slugify(tag);
      const existing = counts.get(tagSlug);
      counts.set(tagSlug, { count: (existing?.count ?? 0) + 1, label: existing?.label ?? tag });
    }
  }
  return counts;
}
