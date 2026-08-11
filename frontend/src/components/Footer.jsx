import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Plus } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

/* ============================================================================
 * HUSHAE FOOTER — Concept 03 (Figma reference): premium editorial fashion-house.
 *
 * Dark monochrome · serif display · sans nav · generous negative space ·
 * thin low-contrast dividers · no cards/gradients/shadows.
 *
 * Structure:
 *   1  NEWSLETTER  — "JOIN THE WORLD OF HUSHAE" + borderless email + SUBSCRIBE →
 *   2  MAIN NAV    — 4 columns: Shop / Customer Care / About / Legal
 *   3  BRAND+FOLLOW — serif wordmark + text social links
 *   4  UTILITY ROW — Country / Language / Currency (minimal interactive dropdowns)
 *   5  BOTTOM BAR  — © 2026 · Secure payments
 *
 * Desktop: static 4-col grid. Mobile: elegant accordions (same data, + / −).
 * Interactions: 180-300ms ease-out; newsletter validation + success/error.
 * ========================================================================== */

const NAV_COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'Women', href: '/women' },
      { label: 'Men', href: '/men' },
      { label: 'New Arrivals', href: '/new' },
      { label: 'Best Sellers', href: '/best' },
      { label: 'Collections', href: '/collection/new-arrivals' },
      { label: 'Sale', href: '/sale' },
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
      { label: 'Materials', href: '/about' },
      { label: 'Careers', href: '/about' },
      { label: 'Store Locator', href: '/shop' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Cookie Policy', href: '/privacy' },
      { label: 'Accessibility', href: '/faq' },
      { label: 'Refund Policy', href: '/returns' },
    ],
  },
];

const SOCIAL = ['Instagram', 'TikTok', 'Pinterest', 'Facebook'];

const BORDER = 'border-[rgba(255,255,255,0.12)]';
const COL_HEAD = 'text-[11px] font-medium uppercase tracking-[0.28em] text-[#F5F2EC]/60';
const NAV_LINK =
  'relative inline-block text-[13px] font-normal text-[#A8A49D] transition-colors duration-200 ease-out after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[#C9A96E] after:transition-transform after:duration-300 after:ease-out hover:text-[#F5F2EC] hover:after:scale-x-100';

/* ── Minimal interactive dropdown (Country / Language / Currency) ───────── */
function Selector({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 border-b border-[rgba(255,255,255,0.25)] pb-1 text-[12px] font-normal uppercase tracking-[0.12em] text-[#A8A49D] transition-colors duration-200 hover:text-[#F5F2EC]"
      >
        <span className="hidden text-[10px] tracking-[0.2em] text-[#A8A49D]/60 md:inline">{label} ·</span>
        {value}
        <ChevronDown size={12} strokeWidth={1.5} aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute bottom-full left-0 z-20 mb-2 min-w-[150px] border border-[rgba(255,255,255,0.14)] bg-[#1A1A1A] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          {options.map((o) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={value === o}
                onClick={() => { onChange(o); setOpen(false); }}
                className={`block w-full px-4 py-2 text-left text-[12px] tracking-[0.08em] transition-colors duration-150 ${value === o ? 'text-[#C9A96E]' : 'text-[#A8A49D] hover:bg-white/5 hover:text-[#F5F2EC]'}`}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

/* ── Mobile accordion column — same data, collapsible, + / − ────────────── */
function MobileNavColumn({ col, open, onToggle, id }) {
  return (
    <div className="border-b border-[rgba(255,255,255,0.12)]">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`footer-panel-${id}`}
          className="flex w-full items-center justify-between py-4 text-left text-[11px] font-medium uppercase tracking-[0.28em] text-[#F5F2EC]/70 transition-colors duration-200 hover:text-[#F5F2EC]"
        >
          {col.title}
          <Plus
            size={15}
            strokeWidth={1.5}
            aria-hidden="true"
            className={`text-[#A8A49D] transition-transform duration-300 ease-out ${open ? 'rotate-45' : ''}`}
          />
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
  const [openCol, setOpenCol] = useState(-1);
  const [country, setCountry] = useState('Pakistan / PK');
  const [language, setLanguage] = useState('English');
  const [currency, setCurrency] = useState('USD $');

  const socialMap = { Instagram: social.instagram, TikTok: social.tiktok, Facebook: social.facebook, Pinterest: '' };

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
      {/* ═══ 1 — NEWSLETTER: editorial headline + borderless form ═══════ */}
      <div className={`border-b ${BORDER}`}>
        <div className="mx-auto grid max-w-[1320px] gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:gap-20 md:px-16 md:py-24">
          <div>
            <h2 className="text-[30px] font-normal uppercase leading-[1.1] tracking-[0.06em] text-[#F5F2EC] md:text-[44px]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Join the world
              <br />
              of HUSHAE
            </h2>
            <p className="mt-5 max-w-md text-[14px] font-normal leading-[1.8] text-[#A8A49D]">
              Subscribe for new collections, exclusive releases and updates from our world.
            </p>
          </div>

          <div>
            {done ? (
              <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Welcome to the world of HUSHAE.</p>
            ) : (
              <form onSubmit={subscribe} noValidate>
                <label htmlFor="footer-email" className="sr-only">Email address</label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }}
                  placeholder="Email address"
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
                    className="group inline-flex min-h-[44px] items-center gap-2 border-b border-[rgba(255,255,255,0.35)] pb-1 text-[11px] font-medium uppercase tracking-[0.24em] text-[#F5F2EC] transition-colors duration-300 hover:border-[#C9A96E] hover:text-[#C9A96E]"
                  >
                    Subscribe
                    <ArrowRight size={13} strokeWidth={1.5} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 2 — MAIN NAV: 4 columns ═══════════════════════════════════ */}
      <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-16 md:py-24">
        <div className="grid gap-14 md:grid-cols-4 md:gap-10 lg:gap-16">
          {NAV_COLUMNS.map((col) => <NavColumn key={col.title} col={col} />)}
        </div>

        {/* Mobile accordions — same data */}
        <div className="mt-14 md:hidden">
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

        {/* ═══ 3 — BRAND + SOCIAL ═════════════════════════════════════ */}
        <div className={`mt-14 flex flex-col gap-10 border-t ${BORDER} pt-12 md:mt-16 md:flex-row md:items-start md:justify-between md:gap-20 md:pt-14`}>
          <div>
            <p className="text-[38px] font-normal uppercase leading-none tracking-[0.3em] text-[#F5F2EC] md:text-[48px]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              HUSHAE
            </p>
            <p className="mt-5 max-w-[32ch] text-[13px] font-normal leading-[1.8] text-[#A8A49D]">
              Premium innerwear for men &amp; women. Made in Pakistan, finished to an international standard.
            </p>
          </div>
          <div>
            <h3 className={COL_HEAD}>Follow</h3>
            <ul className="mt-5 flex flex-col gap-2.5">
              {SOCIAL.map((name) => {
                const href = socialMap[name] || '#';
                return (
                  <li key={name}>
                    {href !== '#' ? (
                      <a href={href} target="_blank" rel="noreferrer" className={NAV_LINK}>{name}</a>
                    ) : (
                      <span className={`${NAV_LINK} cursor-not-allowed opacity-60`}>{name}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* ═══ 4 — UTILITY ROW: country / language / currency ═══════════ */}
      <div className={`border-t ${BORDER}`}>
        <div className="mx-auto flex max-w-[1320px] flex-col items-start gap-4 px-6 py-6 md:flex-row md:items-center md:justify-start md:gap-10 md:px-16">
          <Selector label="Country / Region" value={country} options={['Pakistan / PK', 'United States / US', 'United Kingdom / GB', 'United Arab Emirates / AE']} onChange={setCountry} />
          <Selector label="Language" value={language} options={['English', 'اردو', 'العربية']} onChange={setLanguage} />
          <Selector label="Currency" value={currency} options={['USD $', 'PKR ₨', 'AED د.إ', 'GBP £']} onChange={setCurrency} />
        </div>
      </div>

      {/* ═══ 5 — BOTTOM BAR ═══════════════════════════════════════════ */}
      <div className={`border-t ${BORDER}`}>
        <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-4 px-6 py-6 text-[10px] uppercase tracking-[0.18em] text-[#A8A49D]/60 md:flex-row md:px-16">
          <p>&copy; {new Date().getFullYear()} HUSHAE. All rights reserved.</p>
          <p className="flex items-center gap-3">
            <span className="hidden h-3 w-px bg-[rgba(255,255,255,0.12)] md:block" aria-hidden="true" />
            Secure payments
          </p>
        </div>
      </div>
    </footer>
  );
}
