import type { APIRoute } from 'astro';
import {
  getAllPublishedSummaries,
  CONTENT_COLLECTIONS,
  COLLECTION_LABELS_TR,
} from '../lib/content';
import { CONTENT_COLLECTION_PATHS } from '../lib/urls';
import { SITE, SITE_URL } from '../lib/seo';

const MAX_RECENT_ITEMS = 25;

const POLICY_LINKS: { label: string; path: string }[] = [
  { label: 'Hakkımızda', path: '/hakkimizda/' },
  { label: 'Editörlük Politikası', path: '/editorluk-politikasi/' },
  { label: 'Kaynak Politikası', path: '/kaynak-politikasi/' },
  { label: 'Düzeltme Politikası', path: '/duzeltme-politikasi/' },
  { label: 'Reklam Politikası', path: '/reklam-politikasi/' },
  { label: 'Yapay Zekâ Kullanım Politikası', path: '/yapay-zeka-politikasi/' },
  { label: 'Sorumluluk Reddi', path: '/sorumluluk-reddi/' },
  { label: 'Gizlilik Politikası', path: '/gizlilik-politikasi/' },
];

export const GET: APIRoute = async () => {
  const summaries = await getAllPublishedSummaries();

  const lines: string[] = [];
  lines.push(`# ${SITE.name}`);
  lines.push('');
  lines.push(`> ${SITE.description}`);
  lines.push('');
  lines.push(
    'Bu dosya deneyseldir ve yardımcı bir kaynaktır; sitemap.xml veya robots.txt yerine geçmez ve ' +
      'sıralama garantisi taşımaz. Yalnızca yayımlanmış (draft ve noindex olmayan) temel kategori, ' +
      'politika ve güncel içerik bağlantılarını listeler. Otomatik olarak her build sırasında güncellenir.'
  );
  lines.push('');

  lines.push('## Kategoriler');
  for (const collection of CONTENT_COLLECTIONS) {
    lines.push(
      `- [${COLLECTION_LABELS_TR[collection]}](${SITE_URL}${CONTENT_COLLECTION_PATHS[collection]}/)`
    );
  }
  lines.push('');

  lines.push('## Araçlar');
  lines.push(`- [Konum Bulucu](${SITE_URL}/bolgeler/konum-bul/)`);
  lines.push(`- [Site İçi Arama](${SITE_URL}/arama/)`);
  lines.push('');

  lines.push('## Politikalar ve kurumsal sayfalar');
  for (const link of POLICY_LINKS) {
    lines.push(`- [${link.label}](${SITE_URL}${link.path})`);
  }
  lines.push('');

  lines.push('## Son yayımlanan içerikler');
  for (const item of summaries.slice(0, MAX_RECENT_ITEMS)) {
    lines.push(`- [${item.title}](${SITE_URL}${item.url}): ${item.excerpt}`);
  }
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
