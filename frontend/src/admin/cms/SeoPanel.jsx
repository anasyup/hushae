import { useMemo } from 'react';
import { Globe, Search } from 'lucide-react';
import { Accordion, Select, Text, Toggle } from '../ui/Controls';
import { previewTitle } from '../../lib/cmsConfig';

/* ============================================================================
 * SEO PANEL
 *
 * WHAT A MERCHANT ACTUALLY NEEDS TO SEE
 *   Not "meta description" — the grey line under a Google result. So the
 *   preview is the primary control here and the fields sit under it. Every
 *   counter is a soft limit rendered as "how much of this Google will show",
 *   because Google truncates, it does not reject.
 *
 * LIMITS ARE MEASURED IN PIXELS, NOT CHARACTERS, by Google — but characters
 * are the only thing a merchant can count. 60/160 are the commonly-cited safe
 * points and are used as ADVICE, never as validation: refusing a 62-character
 * title would be inventing a rule Google does not have.
 *
 * The only hard rule is the one the SERVER also enforces:
 * settings.cms.requireSeoTitle blocks publishing without a title.
 * ========================================================================== */

const TITLE_IDEAL = 60;
const DESC_IDEAL = 160;
const TITLE_MAX = 200;
const DESC_MAX = 320;

/** A counter that says what will happen, not just a number. */
function Counter({ value, ideal, max }) {
  const n = (value || '').length;
  const over = n > ideal;
  const wayOver = n > max;
  return (
    <span className={`text-[12px] tabular-nums ${wayOver ? 'font-semibold text-red-700' : over ? 'text-amber-800' : 'text-neutral-600'}`}>
      {n}/{ideal}
      {wayOver ? ' — too long, please shorten' : over ? ' — Google will cut the end off' : ''}
    </span>
  );
}

export default function SeoPanel({ page, cfg, onChange, onChangeSeo }) {
  const seo = page.seo || {};

  /* Exactly what the server's resolveSeo() will compute, mirrored so the
     preview cannot disagree with the page. Falls back title -> page title,
     description -> excerpt -> store default, the same chain, in the same
     order. Duplicating the ORDER is the bug risk, so it is one expression. */
  const resolved = useMemo(() => ({
    title: seo.title || page.title || '',
    fullTitle: previewTitle(seo.title || page.title, cfg),
    description: seo.description || page.excerpt || cfg.seo?.defaultDescription || '',
    canonical: seo.canonical || `/${page.slug || ''}`,
    robots: [
      seo.noIndex || cfg.seo?.defaultNoIndex ? 'noindex' : 'index',
      seo.noFollow ? 'nofollow' : 'follow',
    ].join(', '),
  }), [seo, page.title, page.slug, page.excerpt, cfg]);

  const hidden = seo.noIndex || cfg.seo?.defaultNoIndex;

  return (
    <Accordion
      title="Google & search"
      subtitle="How this page looks when somebody searches for it"
      badge={hidden ? (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[13px] font-semibold text-amber-900 ring-1 ring-amber-300">
          Hidden from Google
        </span>
      ) : null}
    >
      <div className="space-y-4">
        {/* ---- the preview IS the control ---- */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-widest text-neutral-600">
            <Search size={12} aria-hidden="true" /> Preview
          </p>
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="truncate text-[12px] text-[#006621]">hushae.pk/{page.slug || '…'}</p>
            <p className="mt-0.5 truncate text-[12px] leading-snug text-[#1a0dab]">
              {resolved.fullTitle || 'Your page name'}
            </p>
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-neutral-700">
              {resolved.description || 'Write a summary below and it appears here.'}
            </p>
          </div>
          {hidden && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
              This page is set to stay out of Google, so the preview above is only for you. Customers
              can still open the page from a direct link.
            </p>
          )}
        </div>

        {/* ---- title ---- */}
        <div>
          <Text
            label="Search title"
            value={seo.title}
            onChange={(v) => onChangeSeo('title', v.slice(0, TITLE_MAX))}
            placeholder={page.title || 'Size guide'}
            hint={`Leave blank to use the page name. Your shop adds "${(cfg.seo?.titleTemplate || '%s · HUSHAE').replace('%s', '…')}" around it.`}
          />
          <div className="mt-1"><Counter value={seo.title || page.title} ideal={TITLE_IDEAL} max={TITLE_MAX} /></div>
        </div>

        {/* ---- description ---- */}
        <div>
          <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor="seo-desc">Search description</label>
          <textarea
            id="seo-desc" rows={3}
            value={seo.description || ''}
            onChange={(e) => onChangeSeo('description', e.target.value.slice(0, DESC_MAX))}
            aria-describedby="seo-desc-h"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 resize-y"
            placeholder={page.excerpt || 'How to measure yourself and choose the right size.'}
          />
          <p id="seo-desc-h" className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] leading-relaxed text-neutral-600">
            <Counter value={seo.description || page.excerpt} ideal={DESC_IDEAL} max={DESC_MAX} />
            <span>Blank uses the short summary.</span>
          </p>
        </div>

        {/* ---- canonical ---- */}
        <div>
          <Text
            label="Main address for this page"
            value={seo.canonical}
            onChange={(v) => onChangeSeo('canonical', v)}
            placeholder={`/${page.slug || 'size-guide'}`}
            hint="Only fill this in if the same writing also lives somewhere else, and you want Google to count that other address as the real one."
          />
          {seo.canonical && !/^(https?:\/\/|\/)/.test(seo.canonical) && (
            <p role="alert" className="mt-1.5 text-[12px] font-medium text-red-700">
              Start with a slash — for example /{seo.canonical.replace(/^\/+/, '')}
            </p>
          )}
        </div>

        {/* ---- robots ---- */}
        <div className="space-y-2">
          <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-600">Search engines</p>
          <Toggle
            label="Keep this page out of Google"
            checked={!!seo.noIndex}
            onChange={(v) => onChangeSeo('noIndex', v)}
            description="Use for a thank-you page or a private offer. The page still works — it just will not show up in search."
          />
          <Toggle
            label="Tell Google not to follow links on this page"
            checked={!!seo.noFollow}
            onChange={(v) => onChangeSeo('noFollow', v)}
            description="Rarely needed. Only useful when the page links out to places you do not vouch for."
          />
          <p className="rounded-lg bg-neutral-50 px-3 py-2 font-mono text-[12px] text-neutral-700">
            robots: {resolved.robots}
          </p>
          {cfg.seo?.defaultNoIndex && !seo.noIndex && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
              Your shop settings currently hide <strong>every</strong> page from Google, so this one is hidden
              too regardless of the switch above.
            </p>
          )}
        </div>

        {/* ---- keywords: present, honest about their worth ---- */}
        <div>
          <Text
            label="Keywords (optional)"
            value={(seo.keywords || []).join(', ')}
            onChange={(v) => onChangeSeo('keywords', v.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20))}
            placeholder="size guide, bra size, measuring"
            hint="Separate with commas. Google has ignored these for years — they are here for other search tools and your own record."
          />
        </div>

        <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-neutral-600">
          <Globe size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          These settings only take effect once the page is published.
        </p>
      </div>
    </Accordion>
  );
}
