import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, MapPin, Music2, Phone } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

/* ============================================================================
 * HUSHAE footer — luxury dark register (Dribbble references).
 *
 * Structure (common premium pattern):
 *   1  NEWSLETTER band — "Get 10% Off" + borderless input + SIGN UP
 *   2  LINK GRID — brand column (wordmark, tagline, social icons) + Shop/Help/Contact
 *   3  BOTTOM BAR — copyright + legal links + secure note
 *
 * Warm-dark background, gold accents on hover, quiet generous spacing.
 * ========================================================================== */

export default function Footer() {
  const { settings } = useApp();
  const s = settings || {};
  const social = s.integrations?.social || {};
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const colTitle = 'text-[11px] font-medium uppercase tracking-[0.2em] text-white/50';
  const link = 'block text-[13px] font-normal text-white/70 transition-colors duration-300 hover:text-[#C9A96E]';

  return (
    <footer className="mt-24 bg-[#111111] text-white">
      {/* ═══ 1 — NEWSLETTER band ═══════════════════════════════════════ */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 text-center md:flex-row md:justify-between md:px-8 md:text-left md:py-14">
          <div>
            <p className="text-[18px] font-medium uppercase tracking-[0.06em] text-white">Get 10% Off</p>
            <p className="mt-2 text-[13px] font-normal text-white/60">
              Join the circle for early access to new drops and private offers. No spam, ever.
            </p>
          </div>
          {done ? (
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#C9A96E]">You&apos;re on the list.</p>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); if (email.trim()) { api('/subscribers', { method: 'POST', body: { email: email.trim() } }).catch(() => {}); setDone(true); } }}
              className="flex w-full max-w-md items-end gap-3"
            >
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Your email"
                className="min-h-[46px] w-full min-w-0 flex-1 border-0 border-b border-white/30 bg-transparent pb-2 text-[15px] font-normal text-white outline-none transition-colors placeholder:text-white/40 focus:border-[#C9A96E]"
              />
              <button type="submit"
                className="min-h-[46px] shrink-0 bg-white px-8 text-[11px] font-medium uppercase tracking-[0.16em] text-[#111111] transition-colors duration-300 hover:bg-[#C9A96E] hover:text-white">
                Sign Up
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ═══ 2 — LINK GRID ════════════════════════════════════════════ */}
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8 md:py-20">
        {/* Brand column */}
        <div>
          <p className="text-[20px] font-light uppercase tracking-[0.32em] text-white">HUSHAE</p>
          <p className="mt-5 max-w-[28ch] text-[14px] font-normal leading-[1.7] text-white/60">
            {s.tagline || 'Second Skin, First Choice.'}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/40">Made in Pakistan</p>

          {/* Social icons */}
          {(social.instagram || social.facebook || social.tiktok) && (
            <div className="mt-7 flex items-center gap-3">
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"
                  className="grid h-10 w-10 place-items-center border border-white/20 text-white/60 transition-colors duration-300 hover:border-[#C9A96E] hover:text-[#C9A96E]">
                  <Instagram size={16} strokeWidth={1.5} />
                </a>
              )}
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"
                  className="grid h-10 w-10 place-items-center border border-white/20 text-white/60 transition-colors duration-300 hover:border-[#C9A96E] hover:text-[#C9A96E]">
                  <Facebook size={16} strokeWidth={1.5} />
                </a>
              )}
              {social.tiktok && (
                <a href={social.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"
                  className="grid h-10 w-10 place-items-center border border-white/20 text-white/60 transition-colors duration-300 hover:border-[#C9A96E] hover:text-[#C9A96E]">
                  <Music2 size={16} strokeWidth={1.5} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Shop */}
        <div>
          <p className={colTitle}>Shop</p>
          <div className="mt-5 space-y-3">
            <Link className={link} to="/women">Women</Link>
            <Link className={link} to="/men">Men</Link>
            <Link className={link} to="/new">New Arrivals</Link>
            <Link className={link} to="/best">Best Sellers</Link>
            <Link className={link} to="/sale">Sale</Link>
          </div>
        </div>

        {/* Help */}
        <div>
          <p className={colTitle}>Help</p>
          <div className="mt-5 space-y-3">
            <Link className={link} to="/track">Track Order</Link>
            <Link className={link} to="/fit-finder">Fit Finder</Link>
            <Link className={link} to="/faq">FAQ</Link>
            <Link className={link} to="/shipping-policy">Shipping</Link>
            <Link className={link} to="/account">My Account</Link>
          </div>
        </div>

        {/* Contact */}
        <div>
          <p className={colTitle}>Contact</p>
          <div className="mt-5 space-y-3 text-[13px] font-normal text-white/70">
            <p className="flex items-center gap-2"><Mail size={14} className="text-white/40" /> {s.contactEmail || 'care@hushae.pk'}</p>
            <p className="flex items-center gap-2"><Phone size={14} className="text-white/40" /> {s.contactPhone || '0319 8459984'}</p>
            <p className="flex items-center gap-2"><MapPin size={14} className="text-white/40" /> Pakistan — nationwide delivery</p>
          </div>
          <p className="mt-6 text-[10px] uppercase tracking-[0.16em] text-white/40">Secure Payment · Discreet Packaging</p>
        </div>
      </div>

      {/* ═══ 3 — BOTTOM BAR ═══════════════════════════════════════════ */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-[10px] uppercase tracking-[0.16em] text-white/40 md:flex-row md:px-8">
          <p>&copy; {new Date().getFullYear()} HUSHAE · All rights reserved</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="transition-colors duration-300 hover:text-[#C9A96E]">Privacy</Link>
            <Link to="/terms" className="transition-colors duration-300 hover:text-[#C9A96E]">Terms</Link>
            <Link to="/shipping-policy" className="transition-colors duration-300 hover:text-[#C9A96E]">Shipping</Link>
            <span>Secure Payment</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
