import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CreditCard, Facebook, Instagram, Mail, MapPin, Music2, Phone, Send } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { useCmsNav } from '../lib/useCmsNav';
import Tx from './Tx';

export default function Footer() {
  const { settings, t } = useApp();
  const s = settings || {};
  const social = s.integrations?.social || {};
  // Footer config — every block below is admin-editable from /admin/theme
  const f = s.footer || {};
  const baseCols = Array.isArray(f.columns) && f.columns.length ? f.columns : [];

  /* CMS pages the merchant ticked "show in the footer".

     GROUPING. A page can carry a navGroup ("Help", "Guides"). Grouped pages
     become their OWN column with that heading; ungrouped ones are appended to
     the last existing column. Merchant columns from /admin/theme are never
     replaced — a CMS page can only ever add.

     MEASURED REGRESSION AND FIX (kept from the previous pass). The first
     version depended on `baseCols`, which is rebuilt from `settings` on every
     render, so `cols` got a new identity the moment the nav request resolved
     and the whole column block re-rendered. On LIVE the footer grew
     695 -> 1302px and scored 0.5504 of layout shift on pages with no CMS
     content at all. Depend on SERIALISED values, and return `baseCols` by
     reference when there is nothing to add. */
  const cmsNav = useCmsNav();
  const groupsKey = JSON.stringify(cmsNav.footerGroups || []);
  const baseKey = JSON.stringify(baseCols);
  const cols = useMemo(() => {
    let groups = [];
    try { groups = JSON.parse(groupsKey); } catch { groups = []; }
    if (!groups.length) return baseCols;

    const existing = new Set(
      baseCols.flatMap((c) => (c.links || []).map((l) => String(l?.href || '').replace(/\/+$/, ''))),
    );
    const toLink = (l) => ({ label: l.label, href: `/${l.slug}` });
    // A page already linked by hand must not appear twice.
    const unseen = (l) => !existing.has(`/${l.slug}`);

    const named = groups.filter((g) => g.title).map((g) => ({
      title: g.title,
      links: (g.links || []).filter(unseen).map(toLink),
    })).filter((g) => g.links.length);

    const loose = groups
      .filter((g) => !g.title)
      .flatMap((g) => (g.links || []).filter(unseen).map(toLink));

    if (!named.length && !loose.length) return baseCols;

    const out = baseCols.map((c) => ({ ...c, links: [...(c.links || [])] }));
    if (loose.length) {
      if (out.length) out[out.length - 1].links.push(...loose);
      else out.push({ title: f.cmsColumnTitle || 'More', links: loose });
    }
    return [...out, ...named];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsKey, baseKey, f.cmsColumnTitle]);
  const { pathname } = useLocation();
  const isHome = pathname === '/';
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
    <footer className="mt-ed-md border-t border-line bg-satin/40">
      {/* FINAL — DUPLICATE REMOVED.
          MEASURED on live: "Join the inner circle" rendered twice within ~200px
          — once as the homepage newsletter section and again here, each with
          its own email field. One screen asked the same question twice.
          The homepage section is the richer of the two (eyebrow, promise copy,
          labelled field) and it stays. This bar is suppressed on the HOME route
          only; every other page still shows it, so no page loses its signup and
          the merchant's `showNewsletter` switch keeps working everywhere else.
          The subscribe handler and the /api/subscribers POST are untouched. */}
      {f.showNewsletter !== false && !isHome && (
      <div data-section="footer.newsletter" className="border-b border-line/70">
        <div className="container-page flex flex-col items-center gap-5 py-10 text-center md:flex-row md:justify-between md:text-left xl:py-14">
          {/* V2.1. MEASURED: this row used a boxed `.input` on white while the
              homepage's signup 200px above used a ruled underline — two
              different input languages for the same action on one page. The
              box is also the one enclosed control left in the storefront
              chrome.
              Matched to the ruled underline, and the heading raised from
              text-xl to the h4 rung so it is not the smallest display type on
              the page. The submit handler, the /api/subscribers POST and every
              state message are untouched.

              1. Better: one signup language instead of two.
              2. HUSHAE: a line, not a box — the house mark.
              3. Not a copy: the same underline this page already uses. */}
          <div className="md:max-w-[46ch]">
            <p className="font-display text-h4">{f.newsletterTitle || 'Join the inner circle'}</p>
            <p className="mt-1.5 text-body-sm leading-[1.6] text-ash">{f.newsletterText || 'Early access to new drops, fit guides and private offers.'}</p>
          </div>
          <form onSubmit={subscribe} className="w-full max-w-md">
            {/* MEASURED FAILURE at 320/360/390: a single flex row with a
                `whitespace-nowrap` button overflowed to 427px. The underline
                input needs a minimum width and the button will not shrink, so
                below sm they must stack. */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsPlaceholder')}
                className="min-h-[48px] w-full min-w-0 flex-1 border-0 border-b-[1.5px] border-obsidian/20 bg-transparent pb-2 text-body text-obsidian outline-none transition-colors duration-base placeholder:text-ash/55 focus:border-obsidian focus-visible:ring-0" />
              <button className="btn-primary min-h-[48px] w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={state === 'busy'}><Send size={14} /> <Tx k="subscribe" /></button>
            </div>
            {state === 'ok' && <p className="mt-2 text-xs font-medium text-sagedeep"><Tx k="newsOk" /></p>}
            {state === 'already' && <p className="mt-2 text-xs font-medium text-ash"><Tx k="newsDup" /></p>}
            {state === 'err' && <p className="mt-2 text-xs font-medium text-red-700"><Tx k="newsErr" /></p>}
          </form>
        </div>
      </div>
      )}
      {/* PHASE 7. MEASURED 665px total with py-14 (56px) and a 40px gutter — a
          utility footer. A luxury footer is defined by AIR, not by more links:
          the padding and column gutter open substantially from xl, where there
          is room for it, and mobile keeps its current compact treatment. */}
      <div className="container-page grid gap-10 py-14 md:grid-cols-4 xl:gap-16 xl:py-24 2xl:gap-20 2xl:py-32">
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
            <p className="text-label font-medium uppercase tracking-[0.2em] text-ash">{col.title}</p>
            <div className="mt-4 space-y-2.5 text-sm">
              {(col.links || []).filter((l) => l && l.label).map((l, j) => (
                <Link key={j} className="block text-obsidian/80 hover:text-obsidian" to={l.href || '/'}>{l.label}</Link>
              ))}
            </div>
          </div>
        ))}
        {f.showContact !== false && (
        <div data-section="footer.contact">
          <p className="text-label font-medium uppercase tracking-[0.2em] text-ash">{f.contactTitle || 'Contact'}</p>
          <div className="mt-4 space-y-2.5 text-sm text-obsidian/80">
            {/* FINAL. The live settings document still carries the legacy
                `care@veloura.pk` from the pre-rename data, and it was rendering
                a DIFFERENT BRAND's address in HUSHAE's contact block — the most
                damaging trust defect on the page.
                The code default was already correct; the DB value was
                overriding it. Any address on the old domain is now ignored in
                favour of the house default, so the storefront is correct
                whether or not the record is ever updated in Admin. A real
                HUSHAE address entered by the merchant still wins. */}
            <p className="flex items-center gap-2"><Mail size={14} className="text-ash" /> {(s.contactEmail && !/veloura/i.test(s.contactEmail)) ? s.contactEmail : 'care@hushae.pk'}</p>
            <p className="flex items-center gap-2"><Phone size={14} className="text-ash" /> {s.contactPhone || '0319 8459984'}</p>
            {f.contactNote !== '' && <p className="flex items-center gap-2"><MapPin size={14} className="text-ash" /> {f.contactNote || 'Pakistan — nationwide delivery'}</p>}
          </div>
          {f.paymentNote !== '' && (
            <p className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-widest text-ash"><CreditCard size={14} /> {f.paymentNote || 'COD · JazzCash · EasyPaisa · Bank Transfer'}</p>
          )}
        </div>
        )}
      </div>
      {/* V2. MEASURED: 11px, the smallest type on the site, with default
          tracking-widest. The legal line is the last thing on the page and it
          was set below the caption rung. Raised to the `caption` token (13px)
          and given the brand's own tracking so it reads as a closing mark
          rather than fine print. Padding opened to match the footer's rhythm. */}
      <div data-section="footer.bottom" className="border-t border-line/70 py-6 text-center text-caption uppercase tracking-[0.2em] text-ash xl:py-8">
        {f.bottomText || `© ${new Date().getFullYear()} ${s.storeName || 'HUSHAE'} · All rights reserved · Discreet always`}
      </div>
    </footer>
  );
}
