import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useApp } from '../store/AppContext';

/* HUSHAE footer — Calvin Klein register: black, quiet, generous. */
export default function Footer() {
  const { settings } = useApp();
  const s = settings || {};
  return (
    <footer className="mt-24 bg-[#111111] text-white">
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
