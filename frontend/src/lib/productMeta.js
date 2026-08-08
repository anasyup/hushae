/* ============================================================================
 * PRODUCT META — CDLP-style captions derived from the catalogue data.
 *
 * The DB stores full fabric compositions ("92% Modal · 8% Elastane") and
 * product names ("HUSHAE Modal Executive Brief"). The card caption should
 * read like a magazine line, not a database dump:
 *     Everyday Bra        775
 *     Premium Modal
 *     S M L XL XXL
 *     Slate
 * ========================================================================== */

const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w);

/* Title case that also handles hyphenated words: "Second-Skin Wireless Bra"
   stays "Second-Skin Wireless Bra", "MODAL BRIEF" becomes "Modal Brief". */
export const titleCase = (s = '') =>
  String(s || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.split('-').map(cap).join('-'))
    .join(' ')
    .trim();

/* Short premium fabric name derived from the composition string.
   "92% Modal · 8% Elastane"          → "Premium Modal"
   "80% Modal · 20% Cotton"           → "Modal Cotton"
   "95% Modal · 5% Elastane · Lace"   → "Modal Lace"
   "100% Combed Cotton"               → "Combed Cotton"
   "100% Cotton Rib"                  → "Cotton Rib"
   "92% Cotton · 8% Elastane"         → "Cotton Stretch"
   "78% Nylon · 22% Elastane"         → "Technical Nylon"
   Unknown compositions fall back to a cleaned-up title case. */
export function materialName(fabric = '') {
  const f = String(fabric || '').toLowerCase();
  if (!f) return '';
  if (f.includes('modal') && f.includes('cotton')) return 'Modal Cotton';
  if (f.includes('modal') && f.includes('lace')) return 'Modal Lace';
  if (f.includes('modal')) return 'Premium Modal';
  if (f.includes('combed')) return 'Combed Cotton';
  if (f.includes('rib')) return 'Cotton Rib';
  if (f.includes('nylon')) return 'Technical Nylon';
  if (f.includes('cotton')) return 'Cotton Stretch';
  const cleaned = f.replace(/\d+\s*%/g, '').replace(/\s*·\s*/g, ' · ').replace(/·.*$/, '').trim();
  return titleCase(cleaned) || 'Premium Fabric';
}
