import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

/* ============================================================================
 * HUSHAE FOOTER — split luxury (exact HTML/CSS reference provided by client).
 *
 * LEFT  (#171615)  — brand logo, tagline, features, country/language selectors
 * RIGHT (#0a0a0a)  — 3-col nav (Shop / Service / Connect), divider, newsletter
 *                    (borderless + →), legal links, copyright
 *
 * Body #0d0d0d · text #e5e5e5 · primary #fff · secondary #8c8a87 · divider #222
 * Mobile: columns 3→2, tagline 28px, padding 40/24.
 * ========================================================================== */

const NAV = [
  {
    title: 'Shop',
    links: [
      { label: 'Women', href: '/women' },
      { label: 'Men', href: '/men' },
      { label: 'New in', href: '/new' },
      { label: 'Collections', href: '/collection/new-arrivals' },
    ],
  },
  {
    title: 'Service',
    links: [
      { label: 'Help', href: '/faq' },
      { label: 'Delivery', href: '/shipping-policy' },
      { label: 'Returns', href: '/returns' },
      { label: 'Size guide', href: '/fit-finder' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'Instagram', href: '/journal' },
      { label: 'Pinterest', href: '/journal' },
      { label: 'TikTok', href: '/journal' },
      { label: 'Newsletter', href: '#newsletter' },
    ],
  },
];

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cookies', href: '/privacy' },
];

/* ── Minimal native select — transparent, white text, arrow ─────────────── */
function Selector({ label, options, id }) {
  return (
    <div>
      <label htmlFor={id} className="mb-3 block text-[10px] uppercase tracking-[0.15em] text-[#8c8a87]">{label}</label>
      <div className="relative inline-block w-[140px]">
        <select
          id={id}
          defaultValue={options[0]}
          className="w-full cursor-pointer appearance-none border-none bg-transparent pr-5 text-[14px] text-white focus:outline-none"
        >
          {options.map((o) => <option key={o} value={o} className="bg-[#171615]">{o}</option>)}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 -rotate-90 text-[14px] text-white">‹</span>
      </div>
    </div>
  );
}

export default function Footer() {
  const { settings } = useApp();
  const s = settings || {};
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
    <footer className="mt-24 flex min-h-[100vh] w-full flex-wrap bg-[#0d0d0d] text-[#e5e5e5]">
      {/* ═══ LEFT — #171615 ═══════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col justify-between bg-[#171615] px-6 py-12 md:px-16 md:py-20 lg:basis-[450px] lg:px-[60px] lg:py-20">
        {/* Brand */}
        <div>
          <h2 className="text-[32px] font-medium tracking-[0.06em] text-white">
            HUSHAE
          </h2>
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.15em] text-[#8c8a87]">
            Undergarments / Lingerie / Essentials
          </p>
        </div>

        {/* Tagline */}
        <p className="my-10 text-[28px] font-normal leading-[1.25] tracking-[-0.01em] text-[#e6e4e0] md:my-[60px] md:text-[36px]">
          Made for the everyday,
          <br />
          finished for everywhere.
        </p>

        {/* Features */}
        <p className="mb-10 text-[12px] text-[#8c8a87] md:mb-[60px]">
          Worldwide shipping · Easy returns · Secure checkout
        </p>

        {/* Selectors */}
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-[60px]">
          <Selector label="Country / Region" id="ft-country" options={['Pakistan', 'United States', 'United Kingdom', 'UAE']} />
          <Selector label="Language" id="ft-lang" options={['English', 'اردو', 'العربية']} />
        </div>
      </div>

      {/* ═══ RIGHT — #0a0a0a ══════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col bg-[#0a0a0a] px-6 py-12 md:px-12 md:py-20 lg:basis-[550px] lg:px-20 lg:py-20">
        {/* Nav grid — 3 columns */}
        <nav aria-label="Footer" className="mb-12 grid grid-cols-2 gap-x-8 gap-y-10 md:mb-[60px] md:grid-cols-3 md:gap-[40px]">
          {NAV.map((col) => (
            <div key={col.title}>
              <span className="mb-6 block text-[10px] uppercase tracking-[0.15em] text-[#8c8a87]">{col.title}</span>
              <ul className="space-y-4">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith('#') ? (
                      <a href={l.href} className="text-[15px] text-[#d1d1d1] no-underline transition-colors duration-200 hover:text-white">{l.label}</a>
                    ) : (
                      <Link to={l.href} className="text-[15px] text-[#d1d1d1] no-underline transition-colors duration-200 hover:text-white">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Divider */}
        <hr className="mb-12 border-0 border-t border-[#222222] md:mb-[50px]" />

        {/* Newsletter */}
        <div id="newsletter" className="mb-12 scroll-mt-24 md:mb-[60px]">
          <h3 className="mb-6 text-[20px] font-normal text-white">
            {done ? 'Welcome to the circle.' : 'Sign up for updates'}
          </h3>
          {!done && (
            <form onSubmit={subscribe} noValidate className="relative flex max-w-[450px] items-center border-b border-[#333333] pb-3">
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
              <button type="submit" aria-label="Submit" className="cursor-pointer bg-transparent pl-2.5 text-[18px] text-white">
                →
              </button>
            </form>
          )}
          {err && <p role="alert" className="mt-2 text-[11px] text-red-400">{err}</p>}
        </div>

        {/* Legal + Copyright — pinned to bottom */}
        <div className="mt-auto">
          <p className="mb-6 text-[12px] text-[#777777]">
            {LEGAL.map((l, i) => (
              <span key={l.label}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <Link to={l.href} className="no-underline text-[#777777] transition-colors duration-200 hover:text-[#aaaaaa]">{l.label}</Link>
              </span>
            ))}
          </p>
          <p className="text-[12px] text-[#555555]">&copy; {new Date().getFullYear()} HUSHAE</p>
        </div>
      </div>
    </footer>
  );
}
