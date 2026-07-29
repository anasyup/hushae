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
  const boxed = h.logoBoxed !== false;

  // The wordmark is also the home link, so it needs a comfortable tap height
  // even when it is plain text — 44px matches the rest of the header controls.
  const base = `inline-flex min-h-[44px] select-none items-center ${fontCls} font-semibold leading-none ${colorCls} ${hasPx ? '' : sizeCls} ${className} ${
    boxed ? 'border px-3 py-1.5 ' + (forceColor === 'alabaster' ? 'border-alabaster/70' : 'border-obsidian/70') : ''
  }`;
  const style = {
    letterSpacing: `${tracking}em`,
    ...(hasPx ? { fontSize: `clamp(${Math.round(px * 0.82)}px, 4.4vw, ${px}px)` } : {}),
  };

  if (variant === 'plain') return <span className={base} style={style}>{text}</span>;
  return (
    <Link to={to} className={base} style={style} aria-label={`${text} — home`}>
      {text}
    </Link>
  );
}
