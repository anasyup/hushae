import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

/* ============================================================================
 * HUSHAE FOOTER — JET BLACK (#000000) & PURE ORIGINAL WHITE (#FFFFFF)
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
      { label: 'Journal', href: '/journal' },
      { label: 'Rewards', href: '/rewards' },
      { label: 'Contact', href: '/faq' },
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
    <footer className="mt-0 w-full bg-[#000000] text-[#FFFFFF]">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-12 md:px-12 md:py-16">

        {/* ── Row 1 — brand + tagline | newsletter ──────────────────────── */}
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <h2 className="font-sans text-[24px] md:text-[28px] font-medium uppercase tracking-[0.3em] text-[#FFFFFF]">
              HUSHAE
            </h2>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#FFFFFF]/80">
              Undergarments · Lingerie · Essentials
            </p>
            <p className="mt-6 text-[20px] font-light leading-snug text-[#FFFFFF] md:text-[24px]">
              Made for the everyday, finished for everywhere.
            </p>
          </div>

          <div id="newsletter" className="w-full max-w-sm scroll-mt-24">
            <h3 className="text-[15px] font-medium uppercase tracking-wider text-[#FFFFFF]">
              {done ? 'Welcome to the circle.' : 'Sign up for updates'}
            </h3>
            <p className="mt-1.5 text-[12px] text-[#FFFFFF]/80">
              Early access to new drops, private sales and exclusive previews.
            </p>
            {!done && (
              <form onSubmit={subscribe} noValidate className="relative mt-4 flex items-center border-b border-[#FFFFFF]/40 pb-2.5">
                <label htmlFor="ft-email" className="sr-only">Your email</label>
                <input
                  id="ft-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }}
                  placeholder="Enter your email"
                  aria-invalid={err ? 'true' : undefined}
                  aria-describedby={err ? 'ft-email-err' : undefined}
                  className="w-full bg-transparent text-[14px] text-[#FFFFFF] placeholder:text-[#FFFFFF]/60 focus:outline-none focus:border-[#FFFFFF]"
                />
                <button
                  type="submit"
                  aria-label="Subscribe to the newsletter"
                  className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center bg-transparent text-[18px] text-[#FFFFFF] transition-opacity hover:opacity-70"
                >
                  &rarr;
                </button>
              </form>
            )}
            {err && <p id="ft-email-err" role="alert" className="mt-2 text-[11px] text-red-400">{err}</p>}
          </div>
        </div>

        {/* ── hairline ─────────────────────────────────────────────────── */}
        <hr className="my-8 border-0 border-t border-white/15 md:my-10" />

        {/* ── Row 2 — nav | legal ───────────────────────────────────────── */}
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:gap-x-16">
            {NAV.map((col) => (
              <div key={col.title}>
                <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-[#FFFFFF]/90">{col.title}</span>
                <ul className="mt-3 space-y-1">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.href}
                        className="inline-flex min-h-[36px] items-center text-[13px] text-[#FFFFFF] no-underline transition-opacity hover:opacity-70"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Legal links */}
          <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#FFFFFF]/80 md:items-end">
            {LEGAL.map((l, i) => (
              <span key={l.label} className="flex items-center gap-4">
                {i > 0 && <span aria-hidden="true" className="text-white/40">·</span>}
                <Link
                  to={l.href}
                  className="inline-flex min-h-[36px] items-center no-underline text-[#FFFFFF] transition-opacity hover:opacity-70"
                >
                  {l.label}
                </Link>
              </span>
            ))}
          </div>
        </div>

        {/* ── Row 3 — copyright ─────────────────────────────────────────── */}
        <p className="mt-8 text-[12px] text-[#FFFFFF]/70">&copy; {new Date().getFullYear()} HUSHAE · Discreet packaging on every order</p>
        {(() => {
          const a = settings?.businessAddress || {};
          const parts = [a.street, a.city, a.province, a.postalCode, a.country].filter(Boolean);
          if (!parts.length) return null;
          return (
            <address className="mt-2 text-[11px] not-italic tracking-[0.02em] text-[#FFFFFF]/55">
              {settings?.storeName || 'HUSHAE'} · {parts.join(', ')}
            </address>
          );
        })()}
      </div>
    </footer>
  );
}
