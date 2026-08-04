import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

/**
 * Store logo — fully admin-editable from /admin/theme › Header › Logo.
 *
 * settings.header.logoType   'text' | 'image'
 * settings.header.logoImage  uploaded image URL (image mode)
 * settings.header.logoWidth  px width of that image
 * settings.header.logoText   overrides settings.storeName (text mode)
 * settings.header.logoBoxed  draw the outlined box around the wordmark
 * settings.header.logoTracking  letter-spacing ×100 (32 → 0.32em)
 * settings.header.logoSize   font size in px on desktop (mobile scales down)
 * settings.header.logoFont   'display' (serif) | 'sans'
 *
 * Props keep the old API so every existing call site still works:
 *  - size    'sm' | 'md' | 'lg'
 *  - variant 'link' (default) | 'plain'
 */
export default function Wordmark({ size = 'md', variant = 'link', className = '', to = '/', forceColor }) {
  const { settings } = useApp() || {};
  const h = settings?.header || {};

  const sizeCls = size === 'sm' ? 'text-base md:text-lg'
    : size === 'lg' ? 'text-2xl md:text-3xl'
      : 'text-lg md:text-xl';

  const colorCls = forceColor === 'alabaster' ? 'text-alabaster' : 'text-obsidian';

  // Admin-set pixel size overrides the preset scale (mobile keeps 88% of it).
  const px = Number.isFinite(Number(h.logoSize)) ? Number(h.logoSize) : 26;
  const hasPx = size === 'md' && px >= 12 && px <= 48;
  const fontCls = h.logoFont === 'sans' ? 'font-sans' : 'font-display';

  // ── Image logo ────────────────────────────────────────────────────────────
  if (h.logoType === 'image' && h.logoImage) {
    const img = (
      <img
        src={h.logoImage}
        alt={h.logoText || settings?.storeName || 'HUSHAE'}
        style={{ width: `${Math.max(40, Math.min(400, Number(h.logoWidth) || 130))}px` }}
        className={`h-auto max-h-12 object-contain ${className}`}
      />
    );
    if (variant === 'plain') return img;
    return <Link to={to} aria-label="Home" className="inline-flex items-center">{img}</Link>;
  }

  // ── Text wordmark ─────────────────────────────────────────────────────────
  const text = h.logoText || settings?.storeName || 'HUSHAE';
  const tracking = Math.max(0, Math.min(60, Number(h.logoTracking ?? 32))) / 100;
  // Until the settings land the wordmark renders plain. Defaulting the box to
  // ON here made it flash an outline for ~400ms on every cold load.
  const boxed = settings ? h.logoBoxed !== false : false;

  // ── Brand mark — the HUSHAE monogram (black square · white H · red accent),
  //    rendered inline so the header lockup matches the favicon. It inherits
  //    the current text colour, so it flips cleanly on dark surfaces. ────────
  const Mark = ({ size = 26 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"
      className="shrink-0" style={{ borderRadius: 12 }}>
      <rect width="64" height="64" rx="12" fill={forceColor === 'alabaster' ? '#F7F5F1' : '#111111'} />
      <path d="M18 46V18h5.4v9.9h17.2V18H46v28h-5.4V32.9H23.4V46H18z"
        fill={forceColor === 'alabaster' ? '#111111' : '#F7F5F1'} />
      <rect x="22" y="50" width="20" height="2" rx="1" fill="#D50000" />
    </svg>
  );

  // The wordmark is also the home link, so it needs a comfortable tap height
  // even when it is plain text — 44px matches the rest of the header controls.
  const base = `inline-flex min-h-[44px] select-none items-center gap-2.5 ${fontCls} font-bold leading-none ${colorCls} ${hasPx ? '' : sizeCls} ${className} ${
    boxed ? 'border px-3 py-1.5 ' + (forceColor === 'alabaster' ? 'border-alabaster/70' : 'border-obsidian/70') : ''
  }`;
  const style = {
    letterSpacing: `${tracking}em`,
    ...(hasPx ? { fontSize: `clamp(${Math.round(px * 0.82)}px, 4.4vw, ${px}px)` } : {}),
  };

  if (variant === 'plain') return (
    <span className={base} style={style}>
      <Mark size={hasPx ? Math.max(18, Math.min(26, px - 2)) : 22} />
      {text}
    </span>
  );
  return (
    <Link to={to} className={base} style={style} aria-label={`${text} — home`}>
      <Mark size={hasPx ? Math.max(18, Math.min(26, px - 2)) : 22} />
      {text}
    </Link>
  );
}
