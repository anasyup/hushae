import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Facebook, Instagram, Mail, MapPin, Music2, Phone, Send } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { useCmsNav } from '../lib/useCmsNav';
import Tx from './Tx';

const DEFAULT_COLS = [
  { title: 'Shop', links: [
    { label: 'Women', href: '/women' }, { label: 'Men', href: '/men' },
    { label: 'New Arrivals', href: '/new' }, { label: 'Sale', href: '/sale' },
  ]},
  { title: 'Help', links: [
    { label: 'Fit Finder', href: '/fit-finder' }, { label: 'Track Order', href: '/track' },
    { label: 'FAQ', href: '/faq' },
  ]},
  { title: 'Info', links: [
    { label: 'Shipping', href: '/shipping-policy' }, { label: 'Returns', href: '/returns' },
    { label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' },
  ]},
];

export default function Footer() {
  const { settings, t } = useApp();
  const s = settings || {};
  const social = s.integrations?.social || {};
  const f = s.footer || {};
  const baseCols = Array.isArray(f.columns) && f.columns.length ? f.columns : DEFAULT_COLS;

  const cmsNav = useCmsNav();
  const groupsKey = JSON.stringify(cmsNav.footerGroups || []);
  const baseKey = JSON.stringify(baseCols);
  const cols = (() => {
    let groups = [];
    try { groups = JSON.parse(groupsKey); } catch { groups = []; }
    if (!groups.length) return baseCols;
    const existing = new Set(baseCols.flatMap((c) => (c.links || []).map((l) => String(l?.href || '').replace(/\/+$/, ''))));
    const toLink = (l) => ({ label: l.label, href: `/${l.slug}` });
    const named = groups.filter((g) => g.title).map((g) => ({ title: g.title, links: (g.links || []).filter((l) => !existing.has(`/${l.slug}`)).map(toLink) })).filter((g) => g.links.length);
    const loose = groups.filter((g) => !g.title).flatMap((g) => (g.links || []).filter((l) => !existing.has(`/${l.slug}`)).map(toLink));
    if (!named.length && !loose.length) return baseCols;
    const out = baseCols.map((c) => ({ ...c, links: [...(c.links || [])] }));
    if (loose.length) {
      if (out.length) out[out.length - 1].links.push(...loose);
      else out.push({ title: 'More', links: loose });
    }
    return [...out, ...named];
  })();

  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [email, setEmail] = useState('');
  const [state, setState] = useState(null);
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

  const hasSocial = social.instagram || social.facebook || social.tiktok;

  return (
    <footer style={{ background: '#F7F5F1', borderTop: '1px solid #E3E2DF' }}>
      {f.showNewsletter !== false && !isHome && (
        <div style={{ borderBottom: '1px solid #E3E2DF' }}>
          <div className="flex flex-col items-center gap-6 px-4 py-12 text-center md:flex-row md:justify-between md:text-left md:px-8 lg:px-12 xl:py-14" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div className="md:max-w-[44ch]">
              <p className="text-[14px] font-light uppercase tracking-[0.14em] text-[#0E0E0E]">{f.newsletterTitle || 'The Circle'}</p>
              <p className="mt-1.5 text-[13px] text-[#6E6E6B]">{f.newsletterText || 'Early access to new drops. No spam, ever.'}</p>
            </div>
            <form onSubmit={subscribe} className="w-full max-w-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('newsPlaceholder')}
                  className="min-h-[44px] w-full min-w-0 flex-1 border-0 border-b border-[#E3E2DF] bg-transparent pb-2 text-[13px] text-[#0E0E0E] outline-none transition-colors placeholder:text-[#6E6E6B] focus:border-[#0E0E0E]" />
                <button className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-[#0E0E0E] px-6 text-[12px] font-medium uppercase tracking-[0.10em] text-white transition-opacity hover:opacity-80" disabled={state === 'busy'}>
                  <Send size={13} /> <Tx k="subscribe" />
                </button>
              </div>
              {state === 'ok' && <p className="mt-2 text-[11px] font-medium text-[#0E0E0E]"><Tx k="newsOk" /></p>}
              {state === 'already' && <p className="mt-2 text-[11px] text-[#6E6E6B]"><Tx k="newsDup" /></p>}
              {state === 'err' && <p className="mt-2 text-[11px] font-medium text-[#A4231F]"><Tx k="newsErr" /></p>}
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-10 px-4 py-14 md:grid-cols-4 md:px-8 lg:px-12 xl:gap-16 xl:py-20 2xl:gap-20 2xl:py-24" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div>
          <p className="text-[14px] font-light uppercase tracking-[0.12em] text-[#0E0E0E]">{s.storeName || 'HUSHAE'}</p>
          <p className="mt-4 text-[13px] leading-relaxed text-[#6E6E6B] max-w-[32ch]">Premium innerwear. Made in Pakistan, finished to an international standard.</p>
          {hasSocial && (
            <div className="mt-5 flex gap-2">
              {social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center text-[#6E6E6B] hover:text-[#0E0E0E] transition-colors"><Instagram size={16} /></a>}
              {social.facebook && <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-8 w-8 items-center justify-center text-[#6E6E6B] hover:text-[#0E0E0E] transition-colors"><Facebook size={16} /></a>}
              {social.tiktok && <a href={social.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="flex h-8 w-8 items-center justify-center text-[#6E6E6B] hover:text-[#0E0E0E] transition-colors"><Music2 size={16} /></a>}
            </div>
          )}
        </div>

        {cols.map((col, i) => (
          <div key={i}>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6E6E6B]">{col.title}</p>
            <div className="mt-4 space-y-2.5">
              {(col.links || []).filter((l) => l && l.label).map((l, j) => (
                <Link key={j} className="block text-[13px] text-[#0E0E0E]/70 hover:text-[#0E0E0E] transition-colors" to={l.href || '/'}>{l.label}</Link>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6E6E6B]">{f.contactTitle || 'Contact'}</p>
          <div className="mt-4 space-y-2.5 text-[13px] text-[#0E0E0E]/70">
            <p className="flex items-center gap-2"><Mail size={13} className="text-[#6E6E6B] shrink-0" />{(s.contactEmail && !/veloura/i.test(s.contactEmail)) ? s.contactEmail : 'care@hushae.pk'}</p>
            <p className="flex items-center gap-2"><Phone size={13} className="text-[#6E6E6B] shrink-0" />{s.contactPhone || '0319 8459984'}</p>
            <p className="flex items-center gap-2"><MapPin size={13} className="text-[#6E6E6B] shrink-0" />Pakistan</p>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #E3E2DF' }} className="py-5 text-center text-[11px] font-light uppercase tracking-[0.14em] text-[#6E6E6B] px-4">
        &copy; {new Date().getFullYear()} {s.storeName || 'HUSHAE'}
      </div>
    </footer>
  );
}
