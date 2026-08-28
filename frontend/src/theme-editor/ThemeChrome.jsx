import { useEffect, useState } from 'react';

/* ============================================================================
 * ThemeChrome — premium storefront chrome driven by the "App embeds & scripts"
 * theme settings: preloader, back-to-top, smooth scrolling, film grain, Ken
 * Burns (CSS class on the root) and custom JS / head HTML / body HTML.
 * Mounted once on every themed storefront page.
 * ========================================================================== */

export default function ThemeChrome({ theme }) {
  const [loaded, setLoaded] = useState(false);
  const [showTop, setShowTop] = useState(false);

  // Preloader — fades out shortly after first paint.
  useEffect(() => {
    if (!theme.preloader) return;
    const t = setTimeout(() => setLoaded(true), 950);
    return () => clearTimeout(t);
  }, [theme.preloader]);

  // Back-to-top button visibility.
  useEffect(() => {
    if (!theme.backToTop) return;
    const fn = () => setShowTop(window.scrollY > 640);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [theme.backToTop]);

  // Custom JavaScript (app embed).
  useEffect(() => {
    if (!theme.customJs) return;
    try {
      const s = document.createElement('script');
      s.textContent = String(theme.customJs);
      document.head.appendChild(s);
      return () => { s.remove(); };
    } catch { /* noop */ }
  }, [theme.customJs]);

  // Head HTML — meta tags, theme-color, preconnects…
  useEffect(() => {
    if (!theme.headHtml) return;
    try {
      const div = document.createElement('div');
      div.innerHTML = String(theme.headHtml);
      const nodes = Array.from(div.children);
      nodes.forEach((n) => document.head.appendChild(n));
      return () => { nodes.forEach((n) => n.remove()); };
    } catch { /* noop */ }
  }, [theme.headHtml]);

  // Smooth scrolling.
  useEffect(() => {
    if (!theme.smoothScroll) return;
    const el = document.documentElement;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = 'smooth';
    return () => { el.style.scrollBehavior = prev; };
  }, [theme.smoothScroll]);

  return (
    <>
      {theme.preloader && !loaded && (
        <div className="te-preloader" aria-hidden>
          <span className="te-preloader-logo">HUSHAE</span>
          <span className="te-preloader-bar" />
        </div>
      )}
      {theme.backToTop && showTop && (
        <button type="button" className="te-btt" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      )}
      {theme.grain && <div className="te-grain" aria-hidden />}
      {theme.bodyHtml ? <div className="te-body-html" dangerouslySetInnerHTML={{ __html: String(theme.bodyHtml) }} /> : null}
    </>
  );
}
