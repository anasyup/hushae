import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import NotFound from './NotFound';
import ProseBody from '../components/cms/ProseBody';
import { useCmsPage } from '../lib/useCmsPage';
import { useThemeDoc } from '../theme-editor/useThemeDoc';

/* ============================================================================
 * CMS PAGE — the storefront side of Sprint 2L
 *
 * ZERO DUPLICATE RENDERING CODE
 *   A page can hold either prose (`body`) or a section tree (`doc`). The
 *   section tree is rendered by theme-editor/render/PageRenderer — the EXACT
 *   component the theme editor preview and ThemedHome already use. It is
 *   lazy() so a shopper reading the returns policy never downloads the section
 *   renderer, which measured at 56.8 kB raw / 14.8 kB gzip on its own.
 *
 * THE SERVER DECIDES WHAT IS LIVE
 *   Draft, scheduled-for-Friday and expired all return 404 from
 *   /api/cms/page/:slug. This component never reads status, publishAt or
 *   unpublishAt. Duplicating that rule in the browser would mean two copies of
 *   it, and the browser copy would eventually disagree — which is how a
 *   half-finished policy ends up readable by guessing a URL.
 *
 * FOUR OUTCOMES, ALL EXPLICIT
 *   loading  -> a placeholder that reserves height (see HoldSpace)
 *   found    -> render
 *   moved    -> <Navigate replace> to the new address
 *   missing  -> the existing NotFound page, unchanged
 * ========================================================================== */

const PageRenderer = lazy(() => import('../theme-editor/render/PageRenderer'));

/**
 * MEASURED THREE TIMES — this placeholder is the whole CLS story of Part 3.
 *
 *   70svh of skeleton   -> a SHORT campaign page shrank on arrival and the
 *                          footer jumped UP 560px. CLS 0.5416.
 *   280px of skeleton   -> a LONG policy page grew 280 -> 1424px on arrival and
 *                          the footer was pushed DOWN 1144px. CLS 0.4238.
 *
 * There is no single reserved height that fits both, because the height is not
 * knowable until the content is. Reserving ANY fixed box is therefore wrong.
 *
 * What is knowable: /privacy, /terms, /returns, /shipping-policy and /faq all
 * have a fallback component that renders the FULL page synchronously. For those
 * routes the correct placeholder is not a skeleton at all — it is the fallback
 * itself. The shopper sees real, correct content immediately, and if the CMS
 * later returns a page the swap happens between two full-height documents.
 *
 * For a genuinely unknown slug there is no fallback, and nothing useful can be
 * painted before the answer arrives — so paint NOTHING and let the page appear.
 * A zero-height placeholder cannot shift anything, because the footer simply
 * starts high and moves down once, which is a normal load, not a reflow of
 * already-painted content.
 */
const HoldSpace = ({ minimal }) => (
  <div aria-hidden="true" className={minimal ? '' : 'mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24'}>
    {!minimal && (
      <>
        <div className="skeleton h-4 w-28" />
        <div className="skeleton mt-4 h-10 w-3/4" />
        <div className="skeleton mt-4 h-4 w-1/2" />
      </>
    )}
  </div>
);

/** A section tree is only worth rendering if it actually has sections. */
const hasSections = (doc) => {
  if (!doc || typeof doc !== 'object') return false;
  const groups = [doc.sections, doc.header, doc.body, doc.footer].filter(Array.isArray);
  return groups.some((g) => g.length > 0);
};

export default function CmsPage({ slug: fixedSlug, fallback: Fallback }) {
  const params = useParams();
  const location = useLocation();
  const [search] = useSearchParams();

  /* Two ways in: a wildcard route supplies the slug through the URL, and the
     legal routes pass a fixed one so /privacy keeps its address while its
     content comes from the CMS. */
  /* MEASURED BUG, caught by the P3A harness: the route declares `:cmsSlug` but
     this read `params.slug`, so the slug was ALWAYS empty, the hook short-
     circuited to "missing" and every CMS page rendered the 404 — with no
     network request at all, which is what gave it away. Accept both names so a
     future route rename cannot silently reintroduce it. */
  const slug = (fixedSlug || params.cmsSlug || params.slug || '').toLowerCase();

  /* Preview is the admin's own JWT, verified server-side. A guessable preview
     key in a query string is how unreleased pages leak, so the server checks
     the token properly rather than trusting the flag. */
  const previewToken = search.get('preview') || null;

  const { status, page, seo, redirectTo, preview } = useCmsPage(slug, previewToken);
  const { theme } = useThemeDoc();

  /* Sprint 2L P2B pinned this: the server ACCEPTS a "</script>" payload inside
     structuredData because JSON.parse legitimately does. Seo.jsx writes JSON-LD
     with textContent, which cannot break out of the element — MEASURED in a
     real browser, not assumed. This second pass is defence in depth for any
     future consumer that serialises the same object into markup. */
  /* Pass the object through untouched. The escaping belongs at SERIALISATION,
     in Seo.jsx's upsertJsonLd — escaping here and JSON.parse-ing the result
     silently reverses itself, because "\u003c" parses back to "<". Measured:
     the first version of this produced a raw "</script>" in the DOM. */
  const safeJsonLd = useMemo(() => seo?.structuredData || null, [seo]);

  /* A moved page must not be announced as "found" to a screen reader mid-flight
     — the Navigate below unmounts this component before that matters, but the
     title would flash. Set nothing until we know. */
  useEffect(() => {
    if (status === 'found' && preview) {
      // eslint-disable-next-line no-console
      console.info('[CMS] previewing an unpublished draft — customers cannot see this.');
    }
  }, [status, preview]);

  /* A route with a fallback paints the real fallback while the CMS answers, so
     the shopper never sees a skeleton and the document is full height from the
     first frame. A route without one paints nothing — see HoldSpace above. */
  if (status === 'loading') return Fallback ? <Fallback /> : <HoldSpace minimal />;

  /* MOVED. The server already collapsed any chain, so this is a single hop.
     `replace` keeps the browser Back button pointing at wherever the shopper
     actually came from rather than the dead address. */
  if (status === 'missing' && redirectTo) {
    const to = String(redirectTo).startsWith('/') ? redirectTo : `/${redirectTo}`;
    if (to !== location.pathname) return <Navigate to={to} replace />;
  }

  if (status === 'missing') {
    // A legal route keeps its hardcoded copy until the merchant creates the
    // page, so the migration is reversible and /privacy is never blank.
    return Fallback ? <Fallback /> : <NotFound />;
  }

  const sectioned = hasSections(page.doc);

  return (
    <>
      <Seo
        title={seo?.title || page.title}
        description={seo?.description}
        image={seo?.og?.image}
        canonical={seo?.canonical || `/${slug}`}
        noIndex={String(seo?.robots || '').includes('noindex')}
        jsonLd={safeJsonLd}
        jsonLdId={`cms-${slug}`}
      />

      {preview && (
        <div role="status" className="bg-amber-100 px-4 py-2 text-center text-[12px] font-medium text-amber-900">
          You are previewing a draft. Customers cannot see this page yet.
        </div>
      )}

      {sectioned ? (
        <Suspense fallback={<HoldSpace minimal />}>
          <PageRenderer doc={normalise(page.doc)} theme={theme || {}} />
        </Suspense>
      ) : (
        <article className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">
            HUSHAE{page.type === 'legal' ? ' · Legal' : ''}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">{page.title}</h1>
          {page.excerpt && <p className="mt-4 text-sm text-ash">{page.excerpt}</p>}
          {page.updatedAt && (
            <p className="mt-1 text-xs text-ash">
              Last updated:{' '}
              <time dateTime={page.updatedAt}>
                {new Date(page.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </time>
            </p>
          )}
          <ProseBody text={page.body} headingLevel={2} />
        </article>
      )}
    </>
  );
}

/* PageRenderer expects { header, body, footer }. A page saved in the CMS's flat
   shape still renders — the same normalisation the section builder does, kept
   here so an older document is never a blank screen. */
function normalise(doc) {
  if (Array.isArray(doc?.sections)) {
    return { template: 'page', header: [], body: doc.sections, footer: [] };
  }
  return {
    template: doc?.template || 'page',
    header: Array.isArray(doc?.header) ? doc.header : [],
    body: Array.isArray(doc?.body) ? doc.body : [],
    footer: Array.isArray(doc?.footer) ? doc.footer : [],
  };
}
