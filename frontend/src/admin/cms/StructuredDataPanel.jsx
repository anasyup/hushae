import { useEffect, useMemo, useState } from 'react';
import { Braces, Check, TriangleAlert } from 'lucide-react';
import { Accordion } from '../ui/Controls';

/* ============================================================================
 * STRUCTURED DATA (JSON-LD) EDITOR
 *
 * WHAT IT IS, IN SHOP TERMS
 *   A label on the back of the page that Google reads but customers never see.
 *   It is what turns a plain blue link into a result with star ratings, or a
 *   list of questions that open and close inside Google itself.
 *
 * WHY THIS IS THE MOST DANGEROUS FIELD ON THE SCREEN
 *   It is the only place in the CMS where a merchant types raw code, and it is
 *   injected into a <script> tag on a public page. Three separate guards:
 *
 *   1. PARSE, NEVER EVAL. JSON.parse only. A JSON document cannot execute.
 *   2. REFUSE INVALID JSON AT THE BOUNDARY. The Save button is blocked while
 *      the text does not parse — the server refuses too (validateStructuredData
 *      in cmsEngine.js), but a merchant should learn about a missing comma from
 *      the field, not from a red toast after a round trip.
 *   3. STRIP <script>. Even valid JSON can carry the string "</script>", which
 *      would close the tag early and let everything after it run as HTML. This
 *      is checked here AND is the reason the value is stored as an OBJECT, not
 *      as a string, so it is re-serialised by JSON.stringify on output.
 *
 * The templates exist because nobody hand-writes an FAQPage from memory, and a
 * merchant copying one off a blog is how a wrong @type ends up live.
 * ========================================================================== */

const TEMPLATES = [
  {
    id: 'faq',
    label: 'Questions & answers',
    blurb: 'Shows the questions directly in Google, each one openable.',
    build: (page) => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I know my size?',
          acceptedAnswer: { '@type': 'Answer', text: 'Measure around the fullest part of your bust and check the chart on this page.' },
        },
        {
          '@type': 'Question',
          name: 'Can I exchange if it does not fit?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes — within 14 days, unworn and with tags attached.' },
        },
      ],
      ...(page?.title ? {} : {}),
    }),
  },
  {
    id: 'article',
    label: 'Article',
    blurb: 'For a guide or a blog post. Shows the date and author.',
    build: (page) => ({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page?.title || 'Your article title',
      description: page?.excerpt || '',
      author: { '@type': 'Organization', name: 'HUSHAE' },
      publisher: { '@type': 'Organization', name: 'HUSHAE' },
      datePublished: new Date().toISOString().slice(0, 10),
    }),
  },
  {
    id: 'breadcrumb',
    label: 'Breadcrumb trail',
    blurb: 'Shows Home › Guides › This page instead of a bare address.',
    build: (page) => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://hushae.pk/' },
        { '@type': 'ListItem', position: 2, name: page?.title || 'This page', item: `https://hushae.pk/${page?.slug || ''}` },
      ],
    }),
  },
  {
    id: 'howto',
    label: 'Step-by-step',
    blurb: 'For "how to measure yourself" style pages.',
    build: () => ({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to measure your size',
      step: [
        { '@type': 'HowToStep', name: 'Bust', text: 'Measure around the fullest part.' },
        { '@type': 'HowToStep', name: 'Underbust', text: 'Measure directly under the bust, snug but not tight.' },
      ],
    }),
  },
];

/* A closing script tag inside a JSON string ends the <script> element early in
   every browser, whatever the JSON says. Checked case-insensitively and with
   optional whitespace, because `</ SCRIPT >` closes it too. */
const SCRIPT_CLOSE = /<\/\s*script/i;

/** Parse without throwing, and report the problem in words a human can act on. */
export function safeParse(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return { ok: true, value: null, empty: true };

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    // "Unexpected token } in JSON at position 143" -> point at the line.
    const pos = Number((String(e.message).match(/position (\d+)/) || [])[1]);
    let where = '';
    if (Number.isFinite(pos)) {
      const line = raw.slice(0, pos).split('\n').length;
      where = ` (around line ${line})`;
    }
    return { ok: false, message: `This is not valid JSON${where}. Check for a missing comma, quote or bracket.` };
  }

  if (obj === null) return { ok: true, value: null, empty: true };
  if (typeof obj !== 'object') return { ok: false, message: 'This must be a JSON object in { curly brackets }, not a plain value.' };
  if (SCRIPT_CLOSE.test(raw)) {
    return { ok: false, message: 'Remove the </script> text — it would break the page it is added to.' };
  }

  const bytes = new TextEncoder().encode(JSON.stringify(obj)).length;
  if (bytes > 32 * 1024) {
    return { ok: false, message: `Too much data (${Math.round(bytes / 1024)} KB, limit 32 KB).` };
  }
  if (!Array.isArray(obj) && !obj['@type'] && !obj['@graph']) {
    return { ok: false, message: 'Needs an "@type" line saying what this is — for example "FAQPage".' };
  }
  return { ok: true, value: obj, bytes };
}

/** A one-line human summary of what Google will understand. */
function describe(obj) {
  if (!obj) return null;
  const list = Array.isArray(obj) ? obj : obj['@graph'] || [obj];
  return list.map((o) => {
    const t = o?.['@type'] || 'Unknown';
    if (t === 'FAQPage') return `${(o.mainEntity || []).length} question(s)`;
    if (t === 'BreadcrumbList') return `${(o.itemListElement || []).length} step trail`;
    if (t === 'HowTo') return `${(o.step || []).length} step guide`;
    if (t === 'Article') return `Article: ${String(o.headline || '').slice(0, 40)}`;
    return String(t);
  });
}

export default function StructuredDataPanel({ page, cfg, onChangeSeo }) {
  const stored = page.seo?.structuredData;

  /* The textarea holds TEXT while typing; the page holds an OBJECT. Keeping
     them as one value means the field reformats itself mid-keystroke and the
     cursor jumps — measured that behaviour on the promotion JSON field in 2K. */
  const [text, setText] = useState(() => (stored ? JSON.stringify(stored, null, 2) : ''));
  const [dirtyText, setDirtyText] = useState(false);

  /* When the page loads or a version is restored, the stored object changes
     underneath us. Re-seed the box — but never while the merchant is typing. */
  useEffect(() => {
    if (dirtyText) return;
    setText(stored ? JSON.stringify(stored, null, 2) : '');
  }, [stored, dirtyText]);

  const result = useMemo(() => safeParse(text), [text]);
  const summary = useMemo(() => describe(result.ok ? result.value : null), [result]);

  const commit = (next) => {
    setText(next);
    setDirtyText(true);
    const r = safeParse(next);
    // Only ever hand the page a valid object or null. An invalid string must
    // not reach the document, or Save would ship it.
    if (r.ok) onChangeSeo('structuredData', r.value);
    // While invalid, the parent's `sdInvalid` flag (below) blocks Save.
    onChangeSeo('__sdInvalid', !r.ok);
  };

  const applyTemplate = (tpl) => {
    const obj = tpl.build(page);
    const next = JSON.stringify(obj, null, 2);
    setText(next);
    setDirtyText(true);
    onChangeSeo('structuredData', obj);
    onChangeSeo('__sdInvalid', false);
  };

  const enabled = cfg.structuredData?.enabled !== false;

  return (
    <Accordion
      variant="editorial"
      title="Structured data"
      subtitle="Optional. Turns a plain link into a richer search result."
      badge={!result.ok ? (
        <span className="text-[10px] uppercase tracking-[0.14em] text-white/50">Not valid</span>
      ) : result.value ? (
        <span className="text-[10px] uppercase tracking-[0.14em] text-white/70">Ready</span>
      ) : null}
    >
      <div className="space-y-4">
        {!enabled && (
          <p className="text-[12px] leading-relaxed text-white/40">
            Extra information is switched off for the whole shop, so nothing here will be published.
          </p>
        )}

        <p className="text-[12px] leading-relaxed text-white/50">
          This is a note for Google that customers never see. Pick a starting point below and edit the
          words — you do not need to understand the brackets, just keep them where they are.
        </p>

        {/* ---- templates ---- */}
        <div>
          <p className="adm-label mb-1.5 block">Start from</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id} type="button"
                onClick={() => applyTemplate(tpl)}
                className="min-h-[44px] rounded-[4px] border border-white/15 px-3 py-2 text-left transition hover:border-white/40"
              >
                <span className="block text-[12px] text-white">{tpl.label}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-white/35">{tpl.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ---- editor ---- */}
        <div>
          <label className="adm-label mb-1.5 block" htmlFor="sd-json">The note itself</label>
          <textarea
            id="sd-json" rows={12} spellCheck={false}
            value={text}
            onChange={(e) => commit(e.target.value)}
            aria-describedby="sd-json-h"
            aria-invalid={!result.ok}
            className={`min-h-[220px] w-full resize-y rounded-[4px] border bg-[#0A0A0A] px-3 py-2 font-mono text-[12px] leading-relaxed text-white/85 outline-none ${!result.ok ? 'border-white/40' : 'border-white/20'} focus:border-white/50`}
            placeholder='{\n  "@context": "https://schema.org",\n  "@type": "FAQPage"\n}'
          />
          <p id="sd-json-h" className="sr-only">
            JSON-LD structured data. Invalid JSON blocks saving.
          </p>
        </div>

        {/* ---- verdict ---- */}
        {!result.ok ? (
          <p role="alert" className="flex items-start gap-2 border-y border-white/10 py-3 text-[12px] leading-relaxed text-white/70">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{result.message} <strong>Saving is blocked until this is fixed.</strong></span>
          </p>
        ) : result.value ? (
          <div className="border-y border-white/10 py-3">
            <p className="flex items-center gap-2 text-[12px] text-white">
              <Check size={14} aria-hidden="true" /> Google will understand this as:
            </p>
            <ul className="mt-1.5 space-y-0.5 pl-6 text-[12px] text-white/60">
              {summary.map((s, i) => <li key={i} className="list-disc">{s}</li>)}
            </ul>
            <p className="mt-1.5 pl-6 text-[12px] text-white/40">
              {Math.round((result.bytes || 0) / 1024 * 10) / 10} KB of 32 KB used.
            </p>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-[12px] text-white/35">
            <Braces size={12} aria-hidden="true" /> Empty — nothing extra will be sent to Google.
          </p>
        )}

        {result.value && (
          <div>
            <p className="adm-label mb-1.5 block">Check it yourself</p>
            <a
              href="https://search.google.com/test/rich-results"
              target="_blank" rel="noreferrer"
              className="inline-flex min-h-[44px] items-center border border-white/20 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Open Google&apos;s free tester
            </a>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/35">
              Publish the page first, then paste its address into Google&apos;s tester to see the real result.
            </p>
          </div>
        )}
      </div>
    </Accordion>
  );
}
