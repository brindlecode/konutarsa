/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_BUILD_ENV: string;
  readonly PUBLIC_ADSENSE_ENABLED: string;
  readonly PUBLIC_ADSENSE_CLIENT: string;
  readonly PUBLIC_ADSENSE_SLOT_ARTICLE_TOP: string;
  readonly PUBLIC_ADSENSE_SLOT_ARTICLE_MIDDLE: string;
  readonly PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM: string;
  readonly PUBLIC_ADSENSE_SLOT_SIDEBAR: string;
  readonly PUBLIC_GA_ENABLED: string;
  readonly PUBLIC_GA_MEASUREMENT_ID: string;
  readonly PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN: string;
  readonly PUBLIC_GOOGLE_SITE_VERIFICATION: string;
  readonly PUBLIC_BING_SITE_VERIFICATION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type KonutArsaConsentValue = {
  necessary: true;
  analytics: boolean;
  ads: boolean;
  timestamp: number;
};

interface Window {
  trackEvent?: (name: string, params?: Record<string, unknown>) => void;
  konutarsaConsent?: {
    get: () => KonutArsaConsentValue | null;
    set: (value: KonutArsaConsentValue) => void;
  };
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  __konutarsaGaLoaded?: boolean;
  adsbygoogle?: unknown[];
}
