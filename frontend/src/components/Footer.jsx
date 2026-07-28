import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Facebook, Instagram, Mail, MapPin, Music2, Phone, Send } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import Tx from './Tx';

export default function Footer() {
  const { settings, t } = useApp();
  const s = settings || {};
  const social = s.integrations?.social || {};
  // Footer config — every block below is admin-editable from /admin/theme
  const f = s.footer || {};
  const cols = Array.isArray(f.columns) && f.columns.length ? f.columns : [];
  const [email, setEmail] = useState('');
  const [state, setState] = useState(null); // null | 'ok' | 'already' | 'err' | 'busy'

  const subscribe = async (e) => {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    try {
      await api('/subscribers', { method: 'POST', body: { email } });
      setState('ok'); setEmail('');
    } catch (ex) {
      setState(ex.message === 'already' ? 'already' : 'err');
    }
  };

  return (
    <footer className="mt-24 border-t border-line bg-satin/40">
      {/* Newsletter */}
      {f.showNewsletter !== false && (
      <div data-section="footer.newsletter" className="border-b border-line/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-10 text-center md:flex-row md:justify-between md:px-8 md:text-left">
          <div>
            <p className="font-display text-xl">{f.newsletterTitle || 'Join the inner circle'}</p>
            <p className="mt-1 text-sm text-ash">{f.newsletterText || 'Early access to new drops, fit guides and private offers.'}</p>
          </div>
          <form onSubmit={subscribe} className="w-full max-w-md">
            <div className="flex gap-2">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsPlaceholder')} className="input flex-1 bg-white" />
              <button className="btn-primary whitespace-nowrap" disabled={state === 'busy'}><Send size={14} /> <Tx k="subscribe" /></button>
            </div>
            {state === 'ok' && <p className="mt-2 text-xs font-medium text-sagedeep"><Tx k="newsOk" /></p>}
            {state === 'already' && <p className="mt-2 text-xs font-medium text-ash"><Tx k="newsDup" /></p>}
            {state === 'err' && <p className="mt-2 text-xs font-medium text-red-700"><Tx k="newsErr" /></p>}
          </form>
        </div>
      </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-8">
        <div data-section="footer.about">
          <p className="font-display text-lg tracking-widest2 text-obsidian">{s.storeName || 'HUSHAE'}</p>
          <p className="mt-3 text-sm leading-relaxed text-ash">{f.aboutText || s.tagline || 'Second Skin, First Choice.'}</p>
          {f.showSocial !== false && (social.instagram || social.facebook || social.tiktok) && (
            <div className="mt-4 flex gap-2">
              {social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-obsidian/70 transition hover:border-obsidian hover:text-obsidian"><Instagram size={16} /></a>}
              {social.facebook && <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-obsidian/70 transition hover:border-obsidian hover:text-obsidian"><Facebook size={16} /></a>}
              {social.tiktok && <a href={social.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-obsidian/70 transition hover:border-obsidian hover:text-obsidian"><Music2 size={16} /></a>}
            </div>
          )}
          {f.tagline !== '' && <p className="mt-4 text-xs uppercase tracking-widest text-ash">{f.tagline || 'Made in Pakistan · Worn worldwide soon'}</p>}
        </div>
        {/* Link columns — merchant-managed from /admin/theme › Footer */}
        {cols.map((col, i) => (
          <div key={i} data-section={`footer.col${i}`}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ash">{col.title}</p>
            <div className="mt-4 space-y-2.5 text-sm">
              {(col.links || []).filter((l) => l && l.label).map((l, j) => (
                <Link key={j} className="block text-obsidian/80 hover:text-obsidian" to={l.href || '/'}>{l.label}</Link>
              ))}
            </div>
          </div>
        ))}
        {f.showContact !== false && (
        <div data-section="footer.contact">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ash">{f.contactTitle || 'Contact'}</p>
          <div className="mt-4 space-y-2.5 text-sm text-obsidian/80">
            <p className="flex items-center gap-2"><Mail size={14} className="text-ash" /> {s.contactEmail || 'care@hushae.pk'}</p>
            <p className="flex items-center gap-2"><Phone size={14} className="text-ash" /> {s.contactPhone || '+92 300 0000000'}</p>
            {f.contactNote !== '' && <p className="flex items-center gap-2"><MapPin size={14} className="text-ash" /> {f.contactNote || 'Pakistan — nationwide delivery'}</p>}
          </div>
          {f.paymentNote !== '' && (
            <p className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-widest text-ash"><CreditCard size={14} /> {f.paymentNote || 'COD · JazzCash · EasyPaisa · Bank Transfer'}</p>
          )}
        </div>
        )}
      </div>
      <div data-section="footer.bottom" className="border-t border-line/70 py-5 text-center text-[11px] uppercase tracking-widest text-ash">
        {f.bottomText || `© ${new Date().getFullYear()} ${s.storeName || 'HUSHAE'} · All rights reserved · Discreet always`}
      </div>
    </footer>
  );
}
