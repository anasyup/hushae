// Analytics injector — Google Analytics 4 + Meta Pixel + TikTok Pixel.
// Respects the cookie consent stored by CookieConsent.jsx:
//   { essential: true, analytics: bool, marketing: bool }
// - analytics=true  -> GA4 + GTM load
// - marketing=true  -> Meta Pixel + TikTok Pixel load
// If consent hasn't been given yet, we do NOT load anything (privacy-safe default).
// IDs are pulled from public /api/settings (integrations.analytics).

import { useEffect } from 'react';
import { useApp } from '../store/AppContext';

const CONSENT_KEY = 'hushae.consent';

function readConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { analytics: false, marketing: false, given: false };
    const j = JSON.parse(raw);
    return { analytics: !!j.analytics, marketing: !!j.marketing, given: true };
  } catch { return { analytics: false, marketing: false, given: false }; }
}

function loadScript(id, src, extraProps = {}) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.src = src;
  Object.entries(extraProps).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

function injectInline(id, code) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.textContent = code;
  document.head.appendChild(s);
}

function loadGA4(gaId) {
  if (!gaId) return;
  loadScript('ga4-lib', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);
  injectInline('ga4-init', `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', '${gaId}', { anonymize_ip: true, send_page_view: true });
  `);
}

function loadGTM(gtmId) {
  if (!gtmId) return;
  injectInline('gtm-init', `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${gtmId}');
  `);
}

function loadClarity(clarityId) {
  if (!clarityId) return;
  injectInline('clarity-init', `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window,document,'clarity','script','${clarityId}');
  `);
}

function loadMetaPixel(pxId) {
  if (!pxId) return;
  injectInline('meta-pixel-init', `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pxId}');
    fbq('track', 'PageView');
  `);
}

function loadTikTokPixel(ttId) {
  if (!ttId) return;
  injectInline('tt-pixel-init', `
    !function (w, d, t) { w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
    ttq.load('${ttId}');ttq.page();
    }(window, document, 'ttq');
  `);
}

export default function Analytics() {
  const { settings } = useApp();
  const cfg = settings?.integrations?.analytics || {};

  useEffect(() => {
    // Load / update whenever settings change AND consent state changes
    const apply = () => {
      const consent = readConsent();
      if (!consent.given) return; // wait until user chooses
      if (consent.analytics) {
        loadGA4(cfg.gaId?.trim());
        loadGTM(cfg.gtmId?.trim());
        loadClarity(cfg.clarityId?.trim());
      }
      if (consent.marketing) {
        loadMetaPixel(cfg.metaPixelId?.trim());
        loadTikTokPixel(cfg.tiktokPixelId?.trim());
      }
    };
    apply();
    // React to consent changes (CookieConsent writes localStorage; also fire a custom event)
    const onStorage = (e) => { if (e.key === CONSENT_KEY) apply(); };
    const onCustom = () => apply();
    window.addEventListener('storage', onStorage);
    window.addEventListener('hushae:consent', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('hushae:consent', onCustom);
    };
  }, [cfg.gaId, cfg.gtmId, cfg.clarityId, cfg.metaPixelId, cfg.tiktokPixelId]);

  return null;
}
