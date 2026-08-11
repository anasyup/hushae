import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail, MapPin, Phone } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

/* ============================================================================
 * HUSHAE FOOTER — "Modern Split Luxury" (Concept 03).
 *
 * High-end European fashion-house register: dark luxury, editorial type,
 * generous whitespace, thin dividers, no cards/gradients/shadows.
 *   · #111111 near-black bg · #F5F2EC primary · #A8A49D secondary
 *   · borders rgba(255,255,255,.14)
 *
 * Structure:
 *   1  NEWSLETTER — split: editorial "STAY IN THE KNOW" + borderless form
 *   2  BRAND — large serif wordmark (HUSHAE) + tagline
 *   3  4-COL NAV  — Shop / Customer Care / About / Follow (data-driven)
 *   4  COUNTRY/LANGUAGE — Pakistan / English
 *   5  SECURE PAYMENTS — understated trust line
 *   6  LEGAL — © 2026 + Privacy · Terms · Cookies · Accessibility
 *
 * Desktop: static 4-col grid. Mobile: collapsible accordions (same data).
 * Micro-interactions 200-300ms ease only.
 * ========================================================================== */

/* ── Data-driven navigation (single source for desktop grid + mobile accordion) */
const NAV_COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'New Arrivals', href: '/new' },
      { label: 'Women', href: '/women' },
      { label: 'Men', href: '/men' },
      { label: 'Lingerie', href: '/category/bras' },
      { label: 'Underwear', href: '/shop' },
      { label: 'Collections', href: '/collection/new-arrivals' },
    ],
  },
  {
    title: 'Customer Care',
    links: [
      { label: 'Contact Us', href: '/account' },
      { label: 'Shipping & Delivery', href: '/shipping-policy' },
      { label: 'Returns & Exchanges', href: '/returns' },
      { label: 'Size Guide', href: '/fit-finder' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Track Order', href: '/track' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our Story', href: '/about' },
      { label: 'Journal', href: '/journal' },
      { label: 'Sustainability', href: '/about' },
      { label: 'Stores', href: '/shop' },
      { label: 'Contact', href: '/faq' },
    ],
  },
];

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cookies', href: '/privacy' },
  { label: 'Accessibility', href: '/faq' },
];

const BORDER = 'border-[rgba(255,255,255,0.14)]';
const COL_HEAD = 'text-[11px] font-medium uppercase tracking-[0.28em] text-[#F5F2EC]/60';
const NAV_LINK =
  'relative inline-block text-[13px] font-normal text-[#A8A49D] transition-colors duration-300 ease-out after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[#C9A96E] after:transition-transform after:duration-300 after:ease-out hover:text-[#F5F2EC] hover:after:scale-x-100';

/* ── Desktop column ──────────────────────────────────────────────────────── */
function NavColumn({ col }) {
  return (
    <div>
      <h3 className={COL_HEAD}>{col.title}</h3>
      <ul className="mt-6 space-y-3.5">
        {col.links.map((l) => (
          <li key={l.label}>
            <Link to={l.href} className={NAV_LINK}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Mobile accordion column — same data, collapsible, smooth grid-rows ─── */
function MobileNavColumn({ col, open, onToggle, id }) {
  return (
    <div className="border-b border-[rgba(255,255,255,0.14)]">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`footer-panel-${id}`}
          className="flex w-full items-center justify-between py-4 text-left text-[11px] font-medium uppercase tracking-[0.28em] text-[#F5F2EC]/60 transition-colors duration-200 hover:text-[#F5F2EC]"
        >
          {col.title}
          <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true"
            className={`text-[#A8A49D] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div
        id={`footer-panel-${id}`}
        role="region"
        aria-labelledby={`footer-btn-${id}`}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="space-y-3 pb-5">
            {col.links.map((l) => (
              <li key={l.label}>
                <Link to={l.href} className={NAV_LINK}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  const { settings } = useApp();
  const s = settings || {};
  const social = s.integrations?.social || {};
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [openCol, setOpenCol] = useState(0);

  const followLinks = [
    { label: 'Instagram', href: social.instagram || '#', external: !!social.instagram },
    { label: 'TikTok', href: social.tiktok || '#', external: !!social.tiktok },
    { label: 'Facebook', href: social.facebook || '#', external: !!social.facebook },
    { label: 'Pinterest', href: '#', external: false },
  ];

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
    <footer className="mt-24 bg-[#111111] text-[#F5F2EC]">
      {/* ═══ 1 — NEWSLETTER (split: editorial headline | borderless form) ═══ */}
      <div className={`border-b ${BORDER}`}>
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:gap-20 md:px-16 md:py-24">
          {/* Left — editorial headline */}
          <div>
            <h2 className="text-[34px] font-normal uppercase leading-[1.05] tracking-[0.08em] text-[#F5F2EC] md:text-[48px]">
              Stay in
              <br />
              the know
            </h2>
            <p className="mt-5 max-w-md text-[14px] font-normal leading-[1.8] text-[#A8A49D]">
              Sign up for exclusive access to new collections, private offers and the latest from our world.
            </p>
          </div>

          {/* Right — integrated minimal form */}
          <div>
            {done ? (
              <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Welcome to the circle.</p>
            ) : (
              <form onSubmit={subscribe} noValidate className="w-full">
                <label htmlFor="footer-email" className="sr-only">Email address</label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }}
                  placeholder="Your email address"
                  aria-invalid={err ? 'true' : undefined}
                  aria-describedby={err ? 'footer-email-err' : undefined}
                  className="w-full border-0 border-b border-[rgba(255,255,255,0.3)] bg-transparent pb-3 text-[15px] font-normal text-[#F5F2EC] outline-none transition-colors duration-300 placeholder:text-[#A8A49D]/60 focus:border-[#C9A96E]"
                />
                <div className="mt-4 flex items-center justify-between gap-4">
                  {err ? (
                    <p id="footer-email-err" role="alert" className="text-[11px] text-red-400">{err}</p>
                  ) : <span />}
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] items-center justify-center border border-[rgba(255,255,255,0.3)] px-8 text-[11px] font-medium uppercase tracking-[0.24em] text-[#F5F2EC] transition-all duration-300 ease-out hover:border-[#C9A96E] hover:bg-[#C9A96E] hover:text-white"
                  >
                    Subscribe
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 2+3 — BRAND + NAV GRID ════════════════════════════════════ */}
      <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-16 md:py-24">
        <div className="grid gap-14 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-10 lg:gap-16">
          {/* Brand — large serif wordmark */}
          <div>
            <p
              className="text-[44px] font-normal uppercase leading-none tracking-[0.3em] text-[#F5F2EC] md:text-[56px]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              HUSHAE
            </p>
            <p className="mt-6 max-w-[30ch] text-[14px] font-normal leading-[1.8] text-[#A8A49D]">
              {s.tagline || 'Second Skin, First Choice. Premium innerwear, made in Pakistan.'}
            </p>
            <p className="mt-5 text-[10px] uppercase tracking-[0.24em] text-[#A8A49D]/70">Made in Pakistan</p>
          </div>

          {/* Desktop nav grid */}
          <nav aria-label="Footer" className="hidden md:col-span-3 md:grid md:grid-cols-3 md:gap-10 lg:gap-14">
            {NAV_COLUMNS.map((col) => <NavColumn key={col.title} col={col} />)}
          </nav>

          {/* Mobile accordions */}
          <div className="md:hidden">
            {NAV_COLUMNS.map((col, i) => (
              <MobileNavColumn
                key={col.title}
                col={col}
                id={i}
                open={openCol === i}
                onToggle={() => setOpenCol(openCol === i ? -1 : i)}
              />
            ))}
          </div>
        </div>

        {/* Follow — under the grid, quiet social row (desktop right side) */}
        <div className="mt-14 border-t border-[rgba(255,255,255,0.14)] pt-10 md:mt-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className={COL_HEAD}>Follow</h3>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {followLinks.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className={NAV_LINK}>{l.label}</a>
                    ) : (
                      <a href={l.href} className={NAV_LINK + ' cursor-not-allowed opacity-70'}>{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Country / Language — compact premium selector */}
            <button
              type="button"
              className="inline-flex items-center gap-2 border-b border-[rgba(255,255,255,0.3)] pb-1 text-[12px] font-normal uppercase tracking-[0.14em] text-[#A8A49D] transition-colors duration-200 hover:text-[#F5F2EC]"
              aria-label="Country and language: Pakistan, English"
            >
              Pakistan / English
              <ChevronDown size={13} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ 5 — SECURE PAYMENTS (understated) ═══════════════════════════ */}
      <div className={`border-t ${BORDER}`}>
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-6 py-6 text-[10px] uppercase tracking-[0.22em] text-[#A8A49D]/70 md:flex-row md:px-16">
          <span>Secure Payments</span>
          <span className="hidden h-3 w-px bg-[rgba(255,255,255,0.14)] md:block" aria-hidden="true" />
          <span>COD Nationwide · Encrypted Checkout · Discreet Packaging</span>
        </div>
      </div>

      {/* ═══ 6 — LEGAL BAR ═════════════════════════════════════════════ */}
      <div className={`border-t ${BORDER}`}>
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-6 text-[10px] uppercase tracking-[0.18em] text-[#A8A49D]/60 md:flex-row md:px-16">
          <p>&copy; {new Date().getFullYear()} HUSHAE. All rights reserved.</p>
          <ul className="flex items-center gap-6">
            {LEGAL.map((l) => (
              <li key={l.label}>
                <Link to={l.href} className="transition-colors duration-200 hover:text-[#F5F2EC]">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
