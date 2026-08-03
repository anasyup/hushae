import { useMemo } from 'react';

/* ============================================================================
 * PROSE BODY
 *
 * Turns the merchant's plain writing into headings, paragraphs and lists.
 *
 * WHY NOT MARKDOWN, AND WHY NOT HTML
 *   Markdown means shipping a parser (marked is ~12 kB gzip) to every shopper
 *   so a returns policy can have bold text. Raw HTML means a stored-XSS hole:
 *   the merchant is trusted, but an admin account that gets phished should not
 *   be able to inject a script into every visitor's browser.
 *
 *   So the format is the one already described to the merchant in the editor
 *   hint — "a line on its own becomes a heading, everything else becomes a
 *   paragraph" — parsed here into React ELEMENTS. Nothing is ever passed to
 *   dangerouslySetInnerHTML, so there is no injection surface at all. Measured:
 *   a <script> tag typed into the writing box renders as visible text.
 *
 * VISUAL PARITY
 *   The classes below are lifted from pages/Legal.jsx so a migrated policy
 *   looks byte-identical to the hardcoded one it replaces. That is the whole
 *   test of the migration: the merchant should not be able to tell.
 * ========================================================================== */

/* A bullet is a line starting with -, * or •. A heading is a short line with no
   terminal punctuation that is followed by a blank line — the rule the editor
   hint promises. Everything else is a paragraph. */
function parse(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n');
  if (!raw.trim()) return [];

  const blocks = raw.split(/\n{2,}/);
  const out = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const bullets = lines.filter((l) => /^[-*•]\s+/.test(l));
    if (bullets.length === lines.length) {
      out.push({ kind: 'list', items: lines.map((l) => l.replace(/^[-*•]\s+/, '')) });
      continue;
    }

    // A single short line with no sentence-ending punctuation reads as a heading.
    if (lines.length === 1 && lines[0].length <= 80 && !/[.!?:;]$/.test(lines[0])) {
      out.push({ kind: 'heading', text: lines[0] });
      continue;
    }

    // Mixed block: lead lines are prose, trailing bullets become a list.
    const lead = [];
    const tail = [];
    for (const l of lines) (/^[-*•]\s+/.test(l) ? tail : lead).push(l);
    if (lead.length) out.push({ kind: 'para', text: lead.join(' ') });
    if (tail.length) out.push({ kind: 'list', items: tail.map((l) => l.replace(/^[-*•]\s+/, '')) });
  }

  return out;
}

export default function ProseBody({ text, headingLevel = 2 }) {
  const blocks = useMemo(() => parse(text), [text]);
  if (!blocks.length) return null;

  /* headingLevel is a prop for the same reason the rest of the storefront takes
     one: a CMS page rendered under an existing <h1> must not emit a second one,
     and a screen reader's outline is only useful if the levels are honest. */
  const H = `h${Math.min(6, Math.max(2, headingLevel))}`;

  return (
    <div className="prose prose-neutral mt-10 max-w-none text-[15px] leading-relaxed">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          return <H key={i} className="mb-3 mt-10 font-display text-2xl first:mt-0">{b.text}</H>;
        }
        if (b.kind === 'list') {
          return (
            <ul key={i} className="mt-2 mb-3 list-disc pl-6 text-ash">
              {b.items.map((li, k) => <li key={k} className="mb-1.5">{li}</li>)}
            </ul>
          );
        }
        return <p key={i} className="mb-3 text-ash">{b.text}</p>;
      })}
    </div>
  );
}
