import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

/* ============================================================================
 * HUSHAE FOOTER — quiet luxury, single clean column (v3).
 *
 * One dark surface (#0D0D0D), generous but compact:
 *   Row 1 — brand wordmark + tagline | newsletter
 *   Row 2 — nav columns (Shop / Service / Connect) | legal
 *   Row 3 — hairline + copyright
 *
 * Removed: the split two-panel layout and the dead country/language selects
 * (they were non-functional decoration taking vertical space).
 * ========================================================================== */

const NAV = [
  {
    title: 'Shop',
    links: [
      { label: 'Women', href: '/women' },
      { label: 'Men', href: '/men' },
      { label: 'New in', href: '/new' },
      { label: 'Best Sellers', href: '/best' },
      { label: 'Sale', href: '/sale' },
    ],
  },
  {
    title: 'Service',
    links: [
      { label: 'Help', href: '/faq' },
      { label: 'Delivery', href: '/shipping-policy' },
      { label: 'Returns', href: '/returns' },
      { label: 'Size guide', href: '/fit-finder' },
      { label: 'Track order', href: '/track' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'Instagram', href: '/journal' },
      { label: 'Pinterest', href: '/journal' },
      { label: 'TikTok', href: '/journal' },
    ],
  },
];

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cookies', href: '/privacy' },
];

export default function Footer() {
  const { settings } = useApp();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const subscribe = (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) { setErr('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr('Please enter a valid email address.'); return; }
    setErr('');
    api('/subscribers', { method: 'POST', body: { email: v } }).catch(() => {});
    setDone(true);
    setEmail('');
  };

  return (
    <footer className="mt-10 w-full bg-[#0D0D0D] text-[#e5e5e5]">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-10 md:px-[80px] md:py-14">

        {/* ── Row 1 — brand + tagline | newsletter ──────────────────────── */}
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <h2 className="font-serif text-[26px] font-medium uppercase tracking-[0.24em] text-white">
              HUSHAE
            </h2>
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[#8c8a87]">
              Undergarments · Lingerie · Essentials
            </p>
            <p className="mt-8 text-[22px] font-light leading-snug text-[#e6e4e0] md:text-[26px]">
              Made for the everyday, finished for everywhere.
            </p>
          </div>

          <div id="newsletter" className="w-full max-w-sm scroll-mt-24">
            <h3 className="text-[16px] font-normal text-white">
              {done ? 'Welcome to the circle.' : 'Sign up for updates'}
            </h3>
            <p className="mt-1.5 text-[12px] text-[#8c8a87]">
              Early access to new drops and private offers.
            </p>
            {!done && (
              <form onSubmit={subscribe} noValidate className="relative mt-4 flex items-center border-b border-[#333333] pb-2.5">
                <label htmlFor="ft-email" className="sr-only">Your email</label>
                <input
                  id="ft-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }}
                  placeholder="Your email"
                  aria-invalid={err ? 'true' : undefined}
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-[#666666] focus:outline-none"
                />
                <button type="submit" aria-label="Submit" className="cursor-pointer bg-transparent pl-2.5 text-[18px] text-white transition-opacity hover:opacity-70">
                  →
                </button>
              </form>
            )}
            {err && <p role="alert" className="mt-2 text-[11px] text-red-400">{err}</p>}
          </div>
        </div>

        {/* ── hairline ─────────────────────────────────────────────────── */}
        <hr className="my-8 border-0 border-t border-[#222222] md:my-10" />

        {/* ── Row 2 — nav | legal ───────────────────────────────────────── */}
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:gap-x-16">
            {NAV.map((col) => (
              <div key={col.title}>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-[#8c8a87]">{col.title}</span>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.href} className="text-[14px] text-[#d1d1d1] no-underline transition-colors duration-200 hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-5 text-[12px] text-[#777777] md:items-end">
            {LEGAL.map((l, i) => (
              <span key={l.label} className="flex items-center gap-5">
                {i > 0 && <span aria-hidden="true" className="text-[#444444]">·</span>}
                <Link to={l.href} className="no-underline transition-colors duration-200 hover:text-[#aaaaaa]">{l.label}</Link>
              </span>
            ))}
          </div>
        </div>

        {/* ── Row 3 — copyright ─────────────────────────────────────────── */}
        <p className="mt-8 text-[12px] text-[#555555]">&copy; {new Date().getFullYear()} HUSHAE · Discreet packaging on every order</p>
      </div>
    </footer>
  );
}
