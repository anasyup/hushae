/**
 * Product badges — sale, new, bestseller, sold out.
 *
 * Colour alone must not carry meaning (WCAG 1.4.1), so each variant keeps its
 * word label; the tone only reinforces it.
 */
const VARIANTS = {
  sale:    'badge-sale',
  new:     'badge-new',
  best:    'badge-best',
  soldout: 'badge-soldout',
  neutral: 'badge-neutral',
  sage:    'badge-sage',
  /* PHASE 4: the unfilled default for badges sitting ON photography. */
  quiet:   'badge-quiet',
};

export default function Badge({ variant = 'neutral', children, className = '', ...rest }) {
  return (
    <span className={`${VARIANTS[variant] || VARIANTS.neutral} ${className}`} {...rest}>
      {children}
    </span>
  );
}

/** Percentage-off badge, so the rounding rule lives in one place. */
export function SaleBadge({ price, compareAtPrice, className = '' }) {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  const off = Math.round((1 - price / compareAtPrice) * 100);
  if (off < 1) return null;
  return <Badge variant="sale" className={className}>Save {off}%</Badge>;
}
