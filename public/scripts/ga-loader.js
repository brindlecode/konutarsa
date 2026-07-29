// KonutArsa — GA4 yükleyici (bkz. SEO_OPERATIONS_TR.md).
//
// Aynı-origin harici dosya olarak kasıtlı yazılmıştır: sıkı bir
// Content-Security-Policy (script-src 'self', unsafe-inline YOK) altında da
// çalışabilmesi için hiçbir satır içi (inline) script kullanılmaz.
//
// GA ölçüm kimliği <meta name="ga-measurement-id"> etiketinden okunur; bu
// etiket yalnızca PUBLIC_GA_ENABLED=true VE gerçek bir ölçüm kimliği
// tanımlıysa BaseLayout.astro tarafından render edilir. Gerçek yükleme,
// kullanıcı onayı (analytics kategorisi) verilmeden başlamaz.
(function () {
  window.trackEvent = function () {};

  var meta = document.querySelector('meta[name="ga-measurement-id"]');
  var gaId = meta ? meta.content : '';
  if (!gaId) return;

  function loadGa() {
    if (window.__konutarsaGaLoaded) return;
    window.__konutarsaGaLoaded = true;

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaId);
    window.trackEvent = function (name, params) {
      gtag('event', name, params || {});
    };
  }

  var consent = window.konutarsaConsent && window.konutarsaConsent.get();
  if (consent && consent.analytics) {
    loadGa();
  } else {
    window.addEventListener(
      'konutarsa:consent-updated',
      function (event) {
        if (event.detail && event.detail.analytics) loadGa();
      },
      { once: true }
    );
  }
})();
