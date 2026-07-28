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

  const base = `select-none font-display font-semibold ${colorCls} ${sizeCls} ${className} ${
    boxed ? 'inline-flex items-center border px-3 py-1.5 ' + (forceColor === 'alabaster' ? 'border-alabaster/70' : 'border-obsidian/70') : ''
  }`;
  const style = { letterSpacing: `${tracking}em` };

  if (variant === 'plain') return <span className={base} style={style}>{text}</span>;
  return (
    <Link to={to} className={base} style={style} aria-label={`${text} — home`}>
      {text}
    </Link>
  );
}
