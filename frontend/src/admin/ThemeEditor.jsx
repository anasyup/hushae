import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronRight, Eye, GripVertical, Home, Layers, Layout,
  Megaphone, Menu as MenuIcon, Monitor, PanelRightOpen, Plus, Redo2, Save, Settings2,
  ShoppingBag, Smartphone, Sparkles, Star, Store as StoreIcon, Tag, Undo2, X, Zap,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import MediaPicker from '../components/MediaPicker';

/* ============================================================
 * HUSHAE Theme Editor — Shopify-style
 *
 * Layout:
 *   [Top bar] Theme name · Page selector · Device toggle · Undo/Redo · Save
 *   [Left sidebar] Sections tree grouped by Header / Template / Footer
 *   [Right] Live iframe preview of the storefront
 *   [Right sidebar (when a section is picked)] Field editor for that section
 *
 * Persistence:
 *   Every field maps to a `settings.*` path. Save calls PUT /api/settings
 *   with the whole snapshot. The iframe auto-reloads to reflect saved state.
 * ============================================================ */

// Section catalogue — the tree the user sees
const SECTION_TREE = {
  Header: [
    { id: 'offerBar',  label: 'Announcement bar', icon: Megaphone, path: 'offerBar' },
    { id: 'header',    label: 'Header',           icon: Layout,    path: 'header' },
  ],
  Template: [
    { id: 'hero',            label: 'Hero (video/image)',    icon: Sparkles, path: 'hero' },
    { id: 'signatureSplit',  label: 'Signature split hero',  icon: Layers,   path: 'signatureSplit' },
    { id: 'marquee',         label: 'Scrolling text strip',  icon: Zap,      path: 'marquee' },
    { id: 'trustBadges',     label: 'Trust badges',          icon: Star,     path: 'trustBadges' },
    { id: 'featuredRow',     label: 'Featured products',     icon: ShoppingBag, path: 'featuredRow' },
    { id: 'promoPopup',      label: 'Promo popup',           icon: Tag,      path: 'promoPopup' },
  ],
  Footer: [
    { id: 'cookiePopup', label: 'Cookie consent', icon: Settings2, path: 'cookiePopup' },
    { id: 'footer',      label: 'Footer',         icon: Layout,    path: 'footer' },
  ],
};

// Each section defines its own field schema
const FIELD_SCHEMA = {
  offerBar: [
    { key: 'enabled',   label: 'Show announcement bar', type: 'toggle', default: true },
    { key: 'messageEn', label: 'Message',   type: 'text',   default: 'Season Sale — up to 40% off · while stock lasts' },
    { key: 'ctaEn',     label: 'Button label', type: 'text', default: 'Shop the sale' },
    { key: 'link',      label: 'Button link', type: 'text',  default: '/sale' },
  ],
  header: [
    { key: 'storeName', label: 'Store name (wordmark)', type: 'text', default: 'HUSHAE', persistedPath: 'storeName' },
    { key: 'contactPhone', label: 'Contact phone', type: 'text', persistedPath: 'contactPhone' },
    { key: 'contactEmail', label: 'Contact email', type: 'text', persistedPath: 'contactEmail' },
  ],
  hero: [
    { key: 'fullScreen', label: 'Full-screen banner', type: 'toggle', default: true },
    { key: 'eyebrow',    label: 'Eyebrow (small caps)', type: 'text' },
    { key: 'title',      label: 'Title (Enter = new line)', type: 'textarea' },
    { key: 'subtitle',   label: 'Subtitle', type: 'textarea' },
    { key: 'image',      label: 'Background image', type: 'media', accept: 'image' },
    { key: 'video',      label: 'Background video (optional)', type: 'media', accept: 'video' },
    { key: 'overlayOpacity', label: 'Overlay strength', type: 'range', min: 0, max: 90, default: 40 },
    { key: 'align',      label: 'Text alignment', type: 'select', options: [['left', 'Left'], ['center', 'Center']], default: 'left' },
    { key: 'showButtons', label: 'Show CTA buttons', type: 'toggle', default: true },
    { key: 'ctaWomen',   label: 'Button 1 label',   type: 'text', default: 'Shop Women' },
    { key: 'ctaMen',     label: 'Button 2 label',   type: 'text', default: 'Shop Men' },
  ],
  signatureSplit: [
    { key: 'enabled',        label: 'Show section',       type: 'toggle', default: true },
    { key: 'eyebrow',        label: 'Eyebrow',            type: 'text' },
    { key: 'title',          label: 'Title (multi-line)', type: 'textarea' },
    { key: 'subtitle',       label: 'Subtitle',           type: 'textarea' },
    { key: 'textColor',      label: 'Text colour',        type: 'color', default: '#F7F5F1' },
    { key: 'titleFont',      label: 'Title font',         type: 'select', options: [['display', 'Serif (Cormorant)'], ['sans', 'Sans (Inter)']], default: 'display' },
    { key: 'textShadow',     label: 'Text soft glow',     type: 'toggle', default: true },
    { key: 'overlayOpacity', label: 'Image overlay',      type: 'range', min: 0, max: 80, default: 25 },
    { key: 'leftImage',      label: 'Left image (Women)', type: 'media', accept: 'image' },
    { key: 'leftVideo',      label: 'Left video (optional)', type: 'media', accept: 'video' },
    { key: 'leftCtaLabel',   label: 'Left button label',  type: 'text', default: 'Shop Women' },
    { key: 'leftCtaHref',    label: 'Left button link',   type: 'text', default: '/women' },
    { key: 'rightImage',     label: 'Right image (Men)',  type: 'media', accept: 'image' },
    { key: 'rightVideo',     label: 'Right video (optional)', type: 'media', accept: 'video' },
    { key: 'rightCtaLabel',  label: 'Right button label', type: 'text', default: 'Shop Men' },
    { key: 'rightCtaHref',   label: 'Right button link',  type: 'text', default: '/men' },
  ],
  marquee: [
    { key: 'enabled', label: 'Show marquee', type: 'toggle', default: true },
    { key: 'items',   label: 'Messages (one per line)', type: 'lines', default: [] },
  ],
  trustBadges: [
    { key: '_note', label: 'Trust badges are managed in Settings → Store details', type: 'note' },
  ],
  featuredRow: [
    { key: '_note', label: 'Featured products are the ones marked as "Featured" on Products page', type: 'note' },
  ],
  promoPopup: [
    { key: 'enabled',    label: 'Show popup',    type: 'toggle', default: true },
    { key: 'title',      label: 'Title',         type: 'text',   default: 'Join the HUSHAE inner circle' },
    { key: 'subtitle',   label: 'Subtitle',      type: 'text' },
    { key: 'couponCode', label: 'Reward coupon', type: 'text',   default: 'WELCOME10' },
    { key: 'delaySec',   label: 'Show after (seconds)', type: 'number', default: 18 },
  ],
  cookiePopup: [
    { key: 'enabled', label: 'Show cookie banner', type: 'toggle', default: true },
    { key: 'title',   label: 'Title',   type: 'text' },
    { key: 'body',    label: 'Message', type: 'textarea' },
  ],
  footer: [
    { key: '_note', label: 'Footer links (Help / Policies) are auto-linked to /faq /privacy /terms /returns. Contact info comes from Header section above.', type: 'note' },
  ],
};

// Small helpers -----------------------------------------------------------
const getIn = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const setIn = (obj, path, val) => {
  const keys = path.split('.');
  const next = { ...obj };
  let cur = next;
  for (let i = 0; i < keys.length - 1; i += 1) {
    cur[keys[i]] = { ...(cur[keys[i]] || {}) };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = val;
  return next;
};

export default function ThemeEditor() {
  const { auth, toast } = useApp();
  const [settings, setSettings] = useState(null);
  const [initial, setInitial] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState(null); // { group, id }
  const [device, setDevice] = useState('desktop'); // desktop | mobile
  const [openGroups, setOpenGroups] = useState({ Header: true, Template: true, Footer: true });
  const iframeRef = useRef(null);

  // Load current settings
  useEffect(() => {
    api('/settings').then((d) => { setSettings(d.settings || {}); setInitial(d.settings || {}); }).catch(() => toast('Could not load theme'));
  }, []); // eslint-disable-line

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initial), [settings, initial]);

  const pushHistory = (prev) => { setHistory((h) => [...h.slice(-30), prev]); setFuture([]); };
  const undo = () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setFuture((f) => [settings, ...f].slice(0, 30));
    setHistory((h) => h.slice(0, -1));
    setSettings(last);
  };
  const redo = () => {
    if (!future.length) return;
    const [next, ...rest] = future;
    setHistory((h) => [...h, settings]);
    setFuture(rest);
    setSettings(next);
  };

  const updateField = (fullPath, value) => {
    pushHistory(settings);
    setSettings((s) => setIn(s, fullPath, value));
  };

  const save = async () => {
    setBusy(true);
    try {
      // Whitelist: only send the sections we edit here
      const body = {};
      ['storeName', 'contactEmail', 'contactPhone',
        'hero', 'signatureSplit', 'offerBar', 'marquee', 'promoPopup', 'cookiePopup', 'trustBadges'].forEach((k) => {
        if (settings[k] !== undefined) body[k] = settings[k];
      });
      await api('/settings', { method: 'PUT', token: auth.token, body });
      setInitial(settings);
      toast('Theme saved — live on the website');
      if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; // reload preview
    } catch (ex) {
      toast(ex.message || 'Could not save');
    } finally { setBusy(false); }
  };

  if (!settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-100">
        <div className="skeleton h-24 w-64" />
      </div>
    );
  }

  const activeDef = activeSection && FIELD_SCHEMA[activeSection.id];

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-neutral-100 admin-shell">
      {/* ============ TOP BAR ============ */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/store" className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
            <ArrowLeft size={18} />
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            <p className="font-sans text-sm font-semibold text-neutral-900">HUSHAE Theme</p>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Active</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-lg bg-neutral-100 p-1 md:flex">
            <PageChip label="Home page" active />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDevice('desktop')}
            className={`grid h-9 w-9 place-items-center rounded-lg ${device === 'desktop' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
            aria-label="Desktop preview"
          >
            <Monitor size={16} />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`grid h-9 w-9 place-items-center rounded-lg ${device === 'mobile' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
            aria-label="Mobile preview"
          >
            <Smartphone size={16} />
          </button>
          <div className="mx-1 h-6 w-px bg-neutral-200" />
          <button
            onClick={undo}
            disabled={!history.length}
            className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!future.length}
            className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </button>
          <button
            onClick={save}
            disabled={!dirty || busy}
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={14} /> {busy ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      {/* ============ BODY ============ */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — sections tree */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Home page</p>
          </div>
          {Object.entries(SECTION_TREE).map(([group, items]) => (
            <div key={group} className="border-b border-neutral-100">
              <button
                onClick={() => setOpenGroups((g) => ({ ...g, [group]: !g[group] }))}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-900">{group}</p>
                {openGroups[group] ? <ChevronDown size={14} className="text-neutral-500" /> : <ChevronRight size={14} className="text-neutral-500" />}
              </button>
              {openGroups[group] && (
                <div className="pb-2">
                  {items.map((it) => {
                    const Icon = it.icon;
                    const active = activeSection?.id === it.id;
                    return (
                      <button
                        key={it.id}
                        onClick={() => setActiveSection({ group, ...it })}
                        className={`group flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                          active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                        }`}
                      >
                        <GripVertical size={12} className="text-neutral-300" />
                        <Icon size={15} className={active ? 'text-neutral-900' : 'text-neutral-500'} />
                        <span className="text-sm">{it.label}</span>
                      </button>
                    );
                  })}
                  <button
                    disabled
                    className="mt-1 flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-400 opacity-60"
                    title="Sections are fixed for HUSHAE — coming soon: reorder + custom sections"
                  >
                    <Plus size={14} /> Add section
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="p-4">
            <Link to="/admin/store" className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900">
              <ArrowLeft size={11} /> Back to Online Store
            </Link>
          </div>
        </aside>

        {/* Preview iframe */}
        <div className="flex flex-1 items-start justify-center overflow-auto p-6">
          <div
            className={`overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-neutral-200 transition-all duration-300 ${
              device === 'mobile' ? 'w-[390px]' : 'w-full max-w-6xl'
            }`}
            style={{ height: 'calc(100vh - 6.5rem)' }}
          >
            <iframe
              ref={iframeRef}
              src="/?preview=1"
              title="Storefront preview"
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Right panel — section editor */}
        {activeSection && activeDef && (
          <aside className="w-96 shrink-0 overflow-y-auto border-l border-neutral-200 bg-white">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-neutral-100 bg-white p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Editing</p>
                <p className="mt-0.5 font-sans text-base font-semibold text-neutral-900">{activeSection.label}</p>
              </div>
              <button
                onClick={() => setActiveSection(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Close panel"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-4">
              {activeDef.map((f) => (
                <FieldControl
                  key={f.key}
                  field={f}
                  path={sectionPath(activeSection, f)}
                  settings={settings}
                  onChange={(v) => updateField(sectionPath(activeSection, f), v)}
                />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function sectionPath(section, field) {
  if (field.persistedPath) return field.persistedPath;
  if (field.key.startsWith('_')) return null;
  return `${section.path}.${field.key}`;
}

function PageChip({ label, active }) {
  return (
    <button className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold ${active ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>
      <Home size={13} /> {label}
    </button>
  );
}

function FieldControl({ field, path, settings, onChange }) {
  if (field.type === 'note') {
    return (
      <div className="rounded-lg bg-neutral-50 p-3 text-[12px] leading-relaxed text-neutral-500">
        {field.label}
      </div>
    );
  }
  const value = path ? getIn(settings, path) ?? field.default : field.default;
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{field.label}</label>
      {field.type === 'text' && (
        <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === 'textarea' && (
        <textarea rows={4} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === 'number' && (
        <input type="number" className="input" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value) || 0)} />
      )}
      {field.type === 'toggle' && (
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="peer sr-only" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <div className="relative h-6 w-11 rounded-full bg-neutral-200 transition peer-checked:bg-neutral-900 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
          <span className="text-sm text-neutral-600">{value ? 'On' : 'Off'}</span>
        </label>
      )}
      {field.type === 'select' && (
        <select className="input" value={value ?? field.default} onChange={(e) => onChange(e.target.value)}>
          {field.options.map(([v, lb]) => <option key={v} value={v}>{lb}</option>)}
        </select>
      )}
      {field.type === 'color' && (
        <div className="flex items-center gap-2">
          <input type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-neutral-200" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
          <input className="input font-mono text-xs" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
      {field.type === 'range' && (
        <div>
          <input type="range" min={field.min} max={field.max} value={value ?? field.default} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-neutral-900" />
          <p className="mt-1 text-[11px] text-neutral-500">{value ?? field.default}</p>
        </div>
      )}
      {field.type === 'lines' && (
        <textarea rows={4} className="input font-mono text-xs" value={Array.isArray(value) ? value.join('\n') : ''} onChange={(e) => onChange(e.target.value.split('\n'))} />
      )}
      {field.type === 'media' && (
        <MediaPicker value={value || ''} onChange={onChange} accept={field.accept} hideUrl />
      )}
    </div>
  );
}
