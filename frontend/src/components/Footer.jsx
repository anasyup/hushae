import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

/* HUSHAE footer — Calvin Klein register: black, quiet, generous. */
export default function Footer() {
  const { settings } = useApp();
  const s = settings || {};
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <footer className="mt-24 bg-[#111111] text-white">
      {/* Newsletter — spec: clean input on black, white border, SIGN UP */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 text-center md:flex-row md:justify-between md:px-8 md:text-left">
          <div>
            <p className="text-[16px] font-medium uppercase tracking-[0.08em] text-white">Join the Circle</p>
            <p className="mt-1 text-[13px] font-normal text-white/60">Early access to new drops. No spam, ever.</p>
          </div>
          {done ? (
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-white">You&apos;re on the list.</p>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); if (email.trim()) { api('/subscribers', { method: 'POST', body: { email: email.trim() } }).catch(() => {}); setDone(true); } }}
              className="flex w-full max-w-md items-end gap-3"
            >
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Your email"
                className="min-h-[46px] w-full min-w-0 flex-1 border border-white/40 bg-transparent px-4 pb-1 text-[14px] font-normal text-white outline-none transition-colors placeholder:text-white/40 focus:border-white"
              />
              <button type="submit"
                className="min-h-[46px] shrink-0 border border-white bg-transparent px-8 text-[11px] font-medium uppercase tracking-[0.16em] text-white transition-colors duration-300 hover:bg-white hover:text-black">
                Sign Up
              </button>
            </form>
          )}
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-4 md:px-8 md:py-20">
        <div>
          <p className="text-lg font-light uppercase tracking-[0.32em] text-white">HUSHAE</p>
          <p className="mt-4 max-w-[26ch] text-sm font-light leading-relaxed text-white/60">
            {s.tagline || 'Second Skin, First Choice.'}
          </p>
          <p className="mt-5 text-xs uppercase tracking-[0.18em] text-white/40">Made in Pakistan</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">Shop</p>
          <div className="mt-4 space-y-2.5 text-sm">
            <Link className="block font-light text-white/70 transition hover:text-white" to="/women">Women</Link>
            <Link className="block font-light text-white/70 transition hover:text-white" to="/men">Men</Link>
            <Link className="block font-light text-white/70 transition hover:text-white" to="/new">New Arrivals</Link>
            <Link className="block font-light text-white/70 transition hover:text-white" to="/best">Best Sellers</Link>
            <Link className="block font-light text-white/70 transition hover:text-white" to="/sale">Sale</Link>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">Help</p>
          <div className="mt-4 space-y-2.5 text-sm">
            <Link className="block font-light text-white/70 transition hover:text-white" to="/track">Track Order</Link>
            <Link className="block font-light text-white/70 transition hover:text-white" to="/fit-finder">Fit Finder</Link>
            <Link className="block font-light text-white/70 transition hover:text-white" to="/faq">FAQ</Link>
            <Link className="block font-light text-white/70 transition hover:text-white" to="/account">My Account</Link>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">Contact</p>
          <div className="mt-4 space-y-2.5 text-sm font-light text-white/70">
            <p className="flex items-center gap-2"><Mail size={14} className="text-white/40" /> {s.contactEmail || 'care@hushae.pk'}</p>
            <p className="flex items-center gap-2"><Phone size={14} className="text-white/40" /> {s.contactPhone || '0319 8459984'}</p>
            <p className="flex items-center gap-2"><MapPin size={14} className="text-white/40" /> Pakistan — nationwide delivery</p>
          </div>
          <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-white/40">Secure Payment · Discreet Packaging</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-[10px] uppercase tracking-[0.18em] text-white/40">
        &copy; {new Date().getFullYear()} HUSHAE · All rights reserved
      </div>
    </footer>
  );
}
