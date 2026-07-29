import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllPublishedSummaries } from '../lib/content';
import { SITE, SITE_URL } from '../lib/seo';

const MAX_ITEMS = 40;

export async function GET(context: APIContext) {
  const summaries = await getAllPublishedSummaries();

  return rss({
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    site: context.site ?? SITE_URL,
    items: summaries.slice(0, MAX_ITEMS).map((item) => ({
      title: item.title,
      description: item.excerpt,
      pubDate: item.publishedAt,
      link: item.url,
    })),
    customData: '<language>tr</language>',
  });
}
