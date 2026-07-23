import { Link } from 'react-router-dom';
import { CreditCard, Mail, MapPin, Phone } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function Footer() {
  const { settings } = useApp();
  const s = settings || {};
  return (
    <footer className="mt-24 border-t border-line bg-satin/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-8">
        <div>
          <p className="font-display text-lg tracking-widest2 text-obsidian">V É L O U R A</p>
          <p className="mt-3 text-sm leading-relaxed text-ash">{s.tagline || 'Second Skin, First Choice.'}</p>
          <p className="mt-4 text-xs uppercase tracking-widest text-ash">Made in Pakistan · Worn worldwide soon</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Shop</p>
          <div className="mt-4 space-y-2.5 text-sm">
            <Link className="block text-obsidian/80 hover:text-obsidian" to="/women">Women</Link>
            <Link className="block text-obsidian/80 hover:text-obsidian" to="/men">Men</Link>
            <Link className="block text-obsidian/80 hover:text-obsidian" to="/new">New Arrivals</Link>
            <Link className="block text-obsidian/80 hover:text-obsidian" to="/best">Best Sellers</Link>
            <Link className="block text-obsidian/80 hover:text-obsidian" to="/sale">Sale</Link>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Help</p>
          <div className="mt-4 space-y-2.5 text-sm">
            <Link className="block text-obsidian/80 hover:text-obsidian" to="/track">Track Order</Link>
            <Link className="block text-obsidian/80 hover:text-obsidian" to="/fit-finder">Fit Finder</Link>
            <Link className="block text-obsidian/80 hover:text-obsidian" to="/account">My Account</Link>
            <Link className="block text-obsidian/80 hover:text-obsidian" to="/wishlist">Wishlist</Link>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Contact</p>
          <div className="mt-4 space-y-2.5 text-sm text-obsidian/80">
            <p className="flex items-center gap-2"><Mail size={14} className="text-ash" /> {s.contactEmail || 'care@veloura.pk'}</p>
            <p className="flex items-center gap-2"><Phone size={14} className="text-ash" /> {s.contactPhone || '+92 300 0000000'}</p>
            <p className="flex items-center gap-2"><MapPin size={14} className="text-ash" /> Pakistan — nationwide delivery</p>
          </div>
          <p className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-widest text-ash"><CreditCard size={14} /> COD · JazzCash · EasyPaisa · Bank Transfer</p>
        </div>
      </div>
      <div className="border-t border-line/70 py-5 text-center text-[11px] uppercase tracking-widest text-ash">
        © {new Date().getFullYear()} VÉLOURA · All rights reserved · Discreet always
      </div>
    </footer>
  );
}
