import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CreditCard, Facebook, Instagram, Mail, MapPin, Music2, Phone, Send } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { useCmsNav } from '../lib/useCmsNav';
import { storefrontConfig } from '../lib/storefrontConfig';
import Tx from './Tx';

export default function Footer() {
  const { settings, t } = useApp();
  const cfg = useMemo(() => storefrontConfig(settings), [settings]);
  const f = cfg.footer;

  /* CMS pages the merchant ticked "show in the footer". Grouped pages become
     their OWN column; ungrouped append to the last merchant column. Merchant
     columns from /admin/theme are NEVER replaced. Serialised dependencies
     keep this identity-stable so the footer cannot re-measure on every
     settings tick (the 0.5504 CLS regression from a prior pass). */
  const cmsNav = useCmsNav();
  const baseCols = f.columns;
  const groupsKey = JSON.stringify(cmsNav.footerGroups || []);
  const baseKey = JSON.stringify(baseCols);
  const cols = useMemo(() => {
    let groups = [];
    try { groups = JSON.parse(groupsKey); } catch { groups = []; }
    if (!groups.length) return baseCols;

    const existing = new Set(
      baseCols.flatMap((c) => (c.links || []).map((l) => String(l?.href || '').replace(/\/+$/, ''))),
    );
    const toLink = (l) => {
      const href = `/${l.slug}`;
      return { label: String(l.label || '').trim(), href };
    };
    const unseen = (l) => l && l.label && !existing.has(`/${l.slug}`);

    const named = groups
      .filter((g) => g && g.title)
      .map((g) => ({
        title: String(g.title).trim(),
        links: (g.links || []).filter(unseen).map(toLink),
      }))
      .filter((g) => g.title && g.links.length);

    const loose = groups
      .filter((g) => !g || !g.title)
      .flatMap((g) => (g?.links || []).filter(unseen).map(toLink));

    if (!named.length && !loose.length) return baseCols;

    const out = baseCols.map((c) => ({ ...c, links: [...(c.links || [])] }));
    if (loose.length) {
      if (out.length) out[out.length - 1].links.push(...loose);
      else out.push({ title: 'More', links: loose });
    }
    return [...out, ...named];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsKey, baseKey]);

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
    <footer
      data-section="footer"
      className="mt-ed-md border-t border-line bg-satin/40"
      aria-label="Site"
    >
      {f.showNewsletter && !isHome && (
      <div data-section="footer.newsletter" className="border-b border-line/70">
        <div className="container-page flex flex-col items-center gap-5 py-10 text-center md:flex-row md:justify-between md:text-left xl:py-14">
          <div className="md:max-w-[46ch]">
            <p className="font-display text-h4">{f.newsletterTitle}</p>
            <p className="mt-1.5 text-body-sm leading-[1.6] text-ash">{f.newsletterText}</p>
          </div>
          <form onSubmit={subscribe} className="w-full max-w-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label htmlFor="footer-email" className="sr-only">
                {t('newsPlaceholder') || 'Email address'}
              </label>
              <input
                id="footer-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsPlaceholder')}
                className="min-h-[48px] w-full min-w-0 flex-1 border-0 border-b-[1.5px] border-obsidian/20 bg-transparent pb-2 text-body text-obsidian outline-none transition-colors duration-base placeholder:text-ash/55 focus:border-obsidian focus-visible:ring-0"
              />
              <button className="btn-primary min-h-[48px] w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={state === 'busy'}>
                <Send size={14} aria-hidden="true" /> <Tx k="subscribe" />
              </button>
            </div>
            {state === 'ok' && <p className="mt-2 text-xs font-medium text-sagedeep" role="status"><Tx k="newsOk" /></p>}
            {state === 'already' && <p className="mt-2 text-xs font-medium text-ash" role="status"><Tx k="newsDup" /></p>}
            {state === 'err' && <p className="mt-2 text-xs font-medium text-red-700" role="alert"><Tx k="newsErr" /></p>}
          </form>
        </div>
      </div>
      )}

      <div className="container-page grid gap-10 py-14 md:grid-cols-4 xl:gap-16 xl:py-24 2xl:gap-20 2xl:py-32">
        <div data-section="footer.about">
          <p className="font-display text-lg tracking-widest2 text-obsidian">{cfg.storeName}</p>
          <p className="mt-3 text-sm leading-relaxed text-ash">{f.aboutText}</p>

          {f.showSocial && f.socialLinks.length > 0 && (
            <nav aria-label="Social" className="mt-4 flex gap-2">
              {f.socialLinks.map((sl) => {
                const Icon = sl.label === 'Instagram' ? Instagram
                  : sl.label === 'Facebook' ? Facebook
                  : Music2;
                return (
                  <a
                    key={sl.label}
                    href={sl.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={sl.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-obsidian/70 transition hover:border-obsidian hover:text-obsidian"
                  >
                    <Icon size={16} aria-hidden="true" />
                  </a>
                );
              })}
            </nav>
          )}

          {f.tagline && (
            <p className="mt-4 text-xs uppercase tracking-widest text-ash">{f.tagline}</p>
          )}
        </div>

        {cols.map((col, i) => (
          <nav key={i} data-section={`footer.col${i}`} aria-label={col.title}>
            <p className="text-label font-medium uppercase tracking-[0.2em] text-ash">{col.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {(col.links || []).filter((l) => l && l.label).map((l, j) => (
                <li key={j}>
                  {l.href.startsWith('/') ? (
                    <Link className="block text-obsidian/80 transition-colors duration-base hover:text-obsidian" to={l.href}>
                      {l.label}
                    </Link>
                  ) : (
                    <a className="block text-obsidian/80 transition-colors duration-base hover:text-obsidian"
                       href={l.href} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {f.showContact && (
        <div data-section="footer.contact">
          <p className="text-label font-medium uppercase tracking-[0.2em] text-ash">{f.contactTitle}</p>
          <ul className="mt-4 space-y-2.5 text-sm text-obsidian/80">
            {cfg.contactEmail && (
              <li>
                <a href={`mailto:${cfg.contactEmail}`}
                   className="flex items-center gap-2 transition-colors duration-base hover:text-obsidian">
                  <Mail size={14} className="shrink-0 text-ash" aria-hidden="true" />
                  <span>{cfg.contactEmail}</span>
                </a>
              </li>
            )}
            {cfg.contactPhone && (
              <li>
                <a href={`tel:+92${cfg.contactPhone.slice(1)}`}
                   className="flex items-center gap-2 transition-colors duration-base hover:text-obsidian">
                  <Phone size={14} className="shrink-0 text-ash" aria-hidden="true" />
                  <span>+92 {cfg.contactPhone.slice(1)}</span>
                </a>
              </li>
            )}
            {f.contactNote && (
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-ash" aria-hidden="true" />
                <span>{f.contactNote}</span>
              </li>
            )}
          </ul>
          {f.paymentNote && (
            <p className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-widest text-ash">
              <CreditCard size={14} aria-hidden="true" /> {f.paymentNote}
            </p>
          )}
        </div>
        )}
      </div>

      <div data-section="footer.bottom" className="border-t border-line/70 py-6 text-center text-caption uppercase tracking-[0.2em] text-ash xl:py-8">
        {f.bottomText}
      </div>
    </footer>
  );
}
