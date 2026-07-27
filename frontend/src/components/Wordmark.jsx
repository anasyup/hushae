import { Link } from 'react-router-dom';

/**
 * Shared HUSHAE wordmark.
 * - Mobile: compact, no letter-spacing so it never wraps.
 * - Desktop: subtle tracking for editorial feel.
 * - `size` = 'sm' | 'md' | 'lg' (default md)
 * - `variant` = 'link' (default, wraps in Link to /) | 'plain' (just text)
 */
export default function Wordmark({ size = 'md', variant = 'link', className = '', to = '/' }) {
  const sizeCls = size === 'sm'
    ? 'text-base md:text-lg'
    : size === 'lg'
      ? 'text-2xl md:text-3xl'
      : 'text-lg md:text-xl';

  const base = `select-none font-display font-semibold tracking-[0.18em] md:tracking-[0.32em] text-obsidian ${sizeCls} ${className}`;

  if (variant === 'plain') {
    return <span className={base}>HUSHAE</span>;
  }
  return (
    <Link to={to} className={base} aria-label="HUSHAE — home">
      HUSHAE
    </Link>
  );
}
