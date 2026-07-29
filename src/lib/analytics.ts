/**
 * Analytics kapıları (build-time). Gerçek gönderim BaseLayout.astro içindeki
 * script tarafından yapılır: `window.trackEvent(name, params)` global yardımcısı
 * GA4 etkinse `gtag('event', ...)` çağırır, değilse sessizce hiçbir şey yapmaz —
 * bileşenler analytics'in açık olup olmadığını bilmeye gerek duymadan
 * `window.trackEvent?.(...)` çağırabilir.
 */
export function isAnalyticsEnabled(): boolean {
  return (
    import.meta.env.PUBLIC_GA_ENABLED === 'true' &&
    Boolean(import.meta.env.PUBLIC_GA_MEASUREMENT_ID)
  );
}

export function isCloudflareAnalyticsEnabled(): boolean {
  return Boolean(import.meta.env.PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN);
}

/** Kişisel veri, e-posta, tam IP veya hassas form verisi asla bu olaylara eklenmemelidir (bkz. madde 24.1). */
export type AnalyticsEventName =
  | 'article_view'
  | 'internal_search'
  | 'search_result_click'
  | 'share_click'
  | 'outbound_source_click'
  | 'direct_ad_click'
  | 'related_content_click';

export interface AnalyticsEventPayload {
  [key: string]: string | number | boolean | undefined;
}
