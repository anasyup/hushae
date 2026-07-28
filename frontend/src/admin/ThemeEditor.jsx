import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronRight, Copy, Eye, EyeOff, GripVertical, Home, Layers,
  Layout, Megaphone, Monitor, Plus, Redo2, Save, Settings2, ShoppingBag, Smartphone,
  Sparkles, Star, Tag, Trash2, Undo2, X, Zap,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import MediaPicker from '../components/MediaPicker';

/* ============================================================================
 * HUSHAE Theme Editor — Shopify-style
 *
 *   [Top bar]      Theme name · device toggle · undo/redo · Save
 *   [Left tree]    Header / Template / Footer sections
 *                  → Template also lists the merchant's own product sections,
 *                    which can be added, duplicated, hidden, reordered (drag)
 *                    and deleted — no code change needed for a new row.
 *   [Centre]       Live iframe preview of the storefront
 *   [Right panel]  Field editor for the selected section
 *
 * Persistence: every field maps to a `settings.*` path; Save does one
 * PUT /api/settings and reloads the preview iframe.
 * ========================================================================== */

// ── Fixed sections ──────────────────────────────────────────────────────────
const SECTION_TREE = {
  Header: [
    { id: 'offerBar', label: 'Announcement bar', icon: Megaphone, path: 'offerBar' },
    { id: 'header',   label: 'Header',           icon: Layout,    path: 'header' },
  ],
  Template: [
    { id: 'hero',           label: 'Hero (video/image)',   icon: Sparkles, path: 'hero' },
    { id: 'signatureSplit', label: 'Signature split hero', icon: Layers,   path: 'signatureSplit' },
    { id: 'marquee',        label: 'Scrolling text strip', icon: Zap,      path: 'marquee' },
    { id: 'trustBadges',    label: 'Trust badges',         icon: Star,     path: 'trustBadges' },
    { id: 'promoPopup',     label: 'Promo popup',          icon: Tag,      path: 'promoPopup' },
  ],
  Footer: [
    { id: 'cookiePopup', label: 'Cookie consent', icon: Settings2, path: 'cookiePopup' },
    { id: 'footer',      label: 'Footer',         icon: Layout,    path: 'footer' },
  ],
};

const FIELD_SCHEMA = {
  offerBar: [
    { key: 'enabled',   label: 'Show announcement bar', type: 'toggle', default: true },
    { key: 'messageEn', label: 'Message',      type: 'text', default: 'Season Sale — up to 40% off · while stock lasts' },
    { key: 'ctaEn',     label: 'Button label', type: 'text', default: 'Shop the Sale' },
    { key: 'link',      label: 'Button link',  type: 'text', default: '/sale' },
  ],
  header: [
    { key: 'storeName',    label: 'Store name (wordmark)', type: 'text', default: 'HUSHAE', persistedPath: 'storeName' },
    { key: 'contactPhone', label: 'Contact phone', type: 'text', persistedPath: 'contactPhone' },
    { key: 'contactEmail', label: 'Contact email', type: 'text', persistedPath: 'contactEmail' },
  ],
  hero: [
    { key: 'fullScreen',     label: 'Full-screen banner', type: 'toggle', default: true },
    { key: 'eyebrow',        label: 'Eyebrow (small caps)', type: 'text' },
    { key: 'title',          label: 'Title (Enter = new line)', type: 'textarea' },
    { key: 'subtitle',       label: 'Subtitle', type: 'textarea' },
    { key: 'image',          label: 'Background image', type: 'media', accept: 'image' },
    { key: 'video',          label: 'Background video (optional)', type: 'media', accept: 'video' },
    { key: 'overlayOpacity', label: 'Overlay strength', type: 'range', min: 0, max: 90, default: 40 },
    { key: 'align',          label: 'Text alignment', type: 'select', options: [['left', 'Left'], ['center', 'Center']], default: 'left' },
    { key: 'showButtons',    label: 'Show CTA buttons', type: 'toggle', default: true },
    { key: 'ctaWomen',       label: 'Button 1 label', type: 'text', default: 'Shop Women' },
    { key: 'ctaMen',         label: 'Button 2 label', type: 'text', default: 'Shop Men' },
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
  promoPopup: [
    { key: 'enabled',    label: 'Show popup', type: 'toggle', default: true },
    { key: 'title',      label: 'Title',      type: 'text', default: 'Join the HUSHAE inner circle' },
    { key: 'text',       label: 'Message',    type: 'textarea' },
    { key: 'couponCode', label: 'Reward coupon', type: 'text', default: 'WELCOME10' },
    { key: 'delaySec',   label: 'Show after (seconds)', type: 'number', default: 18 },
  ],
  cookiePopup: [
    { key: 'enabled', label: 'Show cookie banner', type: 'toggle', default: true },
    { key: 'title',   label: 'Title',   type: 'text' },
    { key: 'text',    label: 'Message', type: 'textarea' },
  ],
  footer: [
    { key: '_note', label: 'Footer links (Help / Policies) are auto-linked to /faq /privacy /terms /returns. Contact info comes from the Header section above.', type: 'note' },
  ],
};

// ── Product-section schema — the Shopify "Featured collection" parity set ────
const PRODUCT_SECTION_FIELDS = (categories) => [
  { group: 'Source' },
  { key: 'source', label: 'Collection', type: 'select', default: 'featured', options: [
    ['featured', 'Featured products'],
    ['bestSeller', 'Best sellers'],
    ['sale', 'On sale'],
    ['newest', 'Newest arrivals'],
    ['trending', 'Trending (last 30 days)'],
    ['category', 'A specific category'],
  ] },
  { key: 'categorySlug', label: 'Category', type: 'select', showIf: (c) => c.source === 'category',
    options: [['', '— pick a category —'], ...categories.map((c) => [c.slug, `${c.name} (${c.gender})`])] },
  { key: 'gender', label: 'Limit to', type: 'select', default: '', options: [['', 'Everyone'], ['women', 'Women only'], ['men', 'Men only']] },
  { key: 'sort', label: 'Sort by', type: 'select', default: 'newest', showIf: (c) => c.source !== 'trending', options: [
    ['newest', 'Newest first'], ['popular', 'Most popular'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'],
  ] },

  { group: 'Heading' },
  { key: 'eyebrow',      label: 'Eyebrow (small caps)', type: 'text' },
  { key: 'heading',      label: 'Heading', type: 'text', default: 'Featured collection' },
  { key: 'note',         label: 'Side note (desktop only)', type: 'text' },
  { key: 'headingAlign', label: 'Heading alignment', type: 'segment', default: 'left', options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']] },
  { key: 'showViewAll',  label: 'Show "View all" link', type: 'toggle', default: true },
  { key: 'viewAllLabel', label: 'View-all label', type: 'text', default: 'View all', showIf: (c) => c.showViewAll !== false },
  { key: 'viewAllHref',  label: 'View-all link',  type: 'text', default: '/shop',   showIf: (c) => c.showViewAll !== false },

  { group: 'Layout' },
  { key: 'layout',           label: 'Type', type: 'segment', default: 'grid', options: [['grid', 'Grid'], ['carousel', 'Carousel']] },
  { key: 'carouselOnMobile', label: 'Carousel on mobile', type: 'toggle', default: false, showIf: (c) => c.layout !== 'carousel' },
  { key: 'productCount',     label: 'Product count', type: 'range', min: 2, max: 24, default: 8, unit: '' },
  { key: 'columns',          label: 'Columns', type: 'range', min: 2, max: 6, default: 4, unit: '' },
  { key: 'mobileColumns',    label: 'Mobile columns', type: 'segment', default: 2, options: [[1, '1'], [2, '2']] },
  { key: 'gapX',             label: 'Horizontal gap', type: 'range', min: 0, max: 48, default: 8, unit: 'px' },
  { key: 'gapY',             label: 'Vertical gap',   type: 'range', min: 0, max: 64, default: 24, unit: 'px' },

  { group: 'Section layout' },
  { key: 'width',         label: 'Width', type: 'segment', default: 'page', options: [['page', 'Page'], ['full', 'Full']] },
  { key: 'background',    label: 'Background colour', type: 'color', default: '' },
  { key: 'paddingTop',    label: 'Padding top',    type: 'range', min: 0, max: 160, default: 48, unit: 'px' },
  { key: 'paddingBottom', label: 'Padding bottom', type: 'range', min: 0, max: 160, default: 48, unit: 'px' },

  { group: 'Product card' },
  { key: 'imageRatio',    label: 'Image shape', type: 'select', default: 'portrait', options: [['portrait', 'Portrait 4:5'], ['square', 'Square 1:1'], ['tall', 'Tall 3:4']] },
  { key: 'showPrice',     label: 'Show price', type: 'toggle', default: true },
  { key: 'showSaleBadge', label: 'Show sale badge', type: 'toggle', default: true },
  { key: 'showQuickAdd',  label: 'Show Quick Add button', type: 'toggle', default: true },
  { key: 'showWishlist',  label: 'Show wishlist heart', type: 'toggle', default: true },
];

const newProductSection = () => ({
  id: `ps_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  enabled: true,
  source: 'featured', categorySlug: '', gender: '', productIds: [], sort: 'newest',
  eyebrow: '', heading: 'Featured collection', note: '',
  showViewAll: true, viewAllLabel: 'View all', viewAllHref: '/shop', headingAlign: 'left',
  layout: 'grid', carouselOnMobile: false,
  productCount: 8, columns: 4, mobileColumns: 2, gapX: 8, gapY: 24,
  width: 'page', paddingTop: 48, paddingBottom: 48, background: '',
  showPrice: true, showSaleBadge: true, showQuickAdd: true, showWishlist: true,
  imageRatio: 'portrait',
});

// ── helpers ─────────────────────────────────────────────────────────────────
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
  const [categories, setCategories] = useState([]);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState(null); // fixed section
  const [activePs, setActivePs] = useState(null);           // product-section id
  const [device, setDevice] = useState('desktop');
  const [openGroups, setOpenGroups] = useState({ Header: true, Template: true, Footer: true });
  const [dragId, setDragId] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    api('/settings').then((d) => {
      const s = d.settings || {};
      if (!Array.isArray(s.productSections)) s.productSections = [];
      setSettings(s); setInitial(s);
    }).catch(() => toast('Could not load theme'));
    api('/categories').then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []); // eslint-disable-line

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initial), [settings, initial]);

  const pushHistory = (prev) => { setHistory((h) => [...h.slice(-30), prev]); setFuture([]); };
  const undo = () => {
    if (!history.length) return;
    setFuture((f) => [settings, ...f].slice(0, 30));
    setSettings(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
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

  // ── product-section operations ────────────────────────────────────────────
  const psList = settings?.productSections || [];
  const mutatePs = (fn) => {
    pushHistory(settings);
    setSettings((s) => ({ ...s, productSections: fn([...(s.productSections || [])]) }));
  };
  const addPs = () => {
    const sec = newProductSection();
    mutatePs((list) => [...list, sec]);
    setActiveSection(null); setActivePs(sec.id);
  };
  const updatePs = (id, key, value) =>
    mutatePs((list) => list.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  const removePs = (id) => {
    mutatePs((list) => list.filter((x) => x.id !== id));
    if (activePs === id) setActivePs(null);
  };
  const duplicatePs = (id) => mutatePs((list) => {
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return list;
    const copy = { ...list[i], id: newProductSection().id, heading: `${list[i].heading} copy` };
    return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
  });
  const movePs = (from, to) => mutatePs((list) => {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  });

  const save = async () => {
    setBusy(true);
    try {
      const body = {};
      ['storeName', 'contactEmail', 'contactPhone', 'hero', 'signatureSplit', 'offerBar',
        'marquee', 'promoPopup', 'cookiePopup', 'trustBadges', 'productSections'].forEach((k) => {
        if (settings[k] !== undefined) body[k] = settings[k];
      });
      await api('/settings', { method: 'PUT', token: auth.token, body });
      setInitial(settings);
      toast('Theme saved — live on the website');
      if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
    } catch (ex) {
      toast(ex.message || 'Could not save');
    } finally { setBusy(false); }
  };

  if (!settings) {
    return <div className="flex h-screen items-center justify-center bg-neutral-100"><div className="skeleton h-24 w-64" /></div>;
  }

  const activeDef = activeSection && FIELD_SCHEMA[activeSection.id];
  const activePsCfg = psList.find((x) => x.id === activePs) || null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-neutral-100 admin-shell">
      {/* ══ TOP BAR ══ */}
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
        <div className="hidden items-center gap-1 rounded-lg bg-neutral-100 p-1 md:flex">
          <span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm">
            <Home size={13} /> Home page
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDevice('desktop')} aria-label="Desktop preview"
            className={`grid h-9 w-9 place-items-center rounded-lg ${device === 'desktop' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}>
            <Monitor size={16} />
          </button>
          <button onClick={() => setDevice('mobile')} aria-label="Mobile preview"
            className={`grid h-9 w-9 place-items-center rounded-lg ${device === 'mobile' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}>
            <Smartphone size={16} />
          </button>
          <div className="mx-1 h-6 w-px bg-neutral-200" />
          <button onClick={undo} disabled={!history.length} aria-label="Undo"
            className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"><Undo2 size={16} /></button>
          <button onClick={redo} disabled={!future.length} aria-label="Redo"
            className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"><Redo2 size={16} /></button>
          <button onClick={save} disabled={!dirty || busy}
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">
            <Save size={14} /> {busy ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: sections tree ── */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Home page</p>
          </div>

          {Object.entries(SECTION_TREE).map(([group, items]) => (
            <div key={group} className="border-b border-neutral-100">
              <button onClick={() => setOpenGroups((g) => ({ ...g, [group]: !g[group] }))}
                className="flex w-full items-center justify-between px-4 py-3 text-left">
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-900">{group}</p>
                {openGroups[group] ? <ChevronDown size={14} className="text-neutral-500" /> : <ChevronRight size={14} className="text-neutral-500" />}
              </button>

              {openGroups[group] && (
                <div className="pb-2">
                  {items.map((it) => {
                    const Icon = it.icon;
                    const active = activeSection?.id === it.id;
                    return (
                      <button key={it.id}
                        onClick={() => { setActivePs(null); setActiveSection({ group, ...it }); }}
                        className={`group flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'}`}>
                        <Icon size={15} className={active ? 'text-neutral-900' : 'text-neutral-500'} />
                        <span className="text-sm">{it.label}</span>
                      </button>
                    );
                  })}

                  {/* Merchant-created product sections live inside Template */}
                  {group === 'Template' && (
                    <>
                      {psList.length > 0 && (
                        <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Product sections
                        </p>
                      )}
                      {psList.map((ps, i) => {
                        const active = activePs === ps.id;
                        return (
                          <div key={ps.id}
                            draggable
                            onDragStart={() => setDragId(ps.id)}
                            onDragEnd={() => setDragId(null)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const from = psList.findIndex((x) => x.id === dragId);
                              if (from >= 0 && from !== i) movePs(from, i);
                              setDragId(null);
                            }}
                            className={`group flex items-center gap-1.5 px-2 py-0.5 ${dragId === ps.id ? 'opacity-40' : ''}`}>
                            <GripVertical size={12} className="shrink-0 cursor-grab text-neutral-300 active:cursor-grabbing" />
                            <button onClick={() => { setActiveSection(null); setActivePs(ps.id); }}
                              className={`flex flex-1 items-center gap-2 truncate rounded-md px-2 py-2 text-left text-sm transition ${active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                              <ShoppingBag size={14} className={ps.enabled === false ? 'text-neutral-300' : active ? 'text-neutral-900' : 'text-neutral-500'} />
                              <span className={`truncate ${ps.enabled === false ? 'text-neutral-400 line-through' : ''}`}>
                                {ps.heading || 'Product section'}
                              </span>
                            </button>
                            <button onClick={() => updatePs(ps.id, 'enabled', ps.enabled === false)}
                              title={ps.enabled === false ? 'Show section' : 'Hide section'}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded text-neutral-400 opacity-0 hover:bg-neutral-100 hover:text-neutral-900 group-hover:opacity-100">
                              {ps.enabled === false ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        );
                      })}
                      <button onClick={addPs}
                        className="mt-1 flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900">
                        <Plus size={14} /> Add product section
                      </button>
                    </>
                  )}
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

        {/* ── CENTRE: preview ── */}
        <div className="flex flex-1 items-start justify-center overflow-auto p-6">
          <div className={`overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-neutral-200 transition-all duration-300 ${device === 'mobile' ? 'w-[390px]' : 'w-full max-w-6xl'}`}
            style={{ height: 'calc(100vh - 6.5rem)' }}>
            <iframe ref={iframeRef} src="/?preview=1" title="Storefront preview" className="h-full w-full" />
          </div>
        </div>

        {/* ── RIGHT: fixed-section editor ── */}
        {activeSection && activeDef && (
          <aside className="w-96 shrink-0 overflow-y-auto border-l border-neutral-200 bg-white">
            <PanelHeader label={activeSection.label} onClose={() => setActiveSection(null)} />
            <div className="space-y-4 p-4">
              {activeDef.map((f) => (
                <FieldControl key={f.key} field={f}
                  value={fixedValue(settings, activeSection, f)}
                  onChange={(v) => { const p = sectionPath(activeSection, f); if (p) updateField(p, v); }} />
              ))}
            </div>
          </aside>
        )}

        {/* ── RIGHT: product-section editor ── */}
        {activePsCfg && (
          <aside className="w-96 shrink-0 overflow-y-auto border-l border-neutral-200 bg-white">
            <PanelHeader label={activePsCfg.heading || 'Product section'} onClose={() => setActivePs(null)}
              actions={(
                <>
                  <button onClick={() => duplicatePs(activePsCfg.id)} title="Duplicate"
                    className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"><Copy size={14} /></button>
                  <button onClick={() => { if (confirm('Delete this section?')) removePs(activePsCfg.id); }} title="Delete"
                    className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                </>
              )} />
            <div className="space-y-4 p-4">
              <label className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2.5">
                <span className="text-sm font-medium text-neutral-700">Section visible</span>
                <Toggle checked={activePsCfg.enabled !== false} onChange={(v) => updatePs(activePsCfg.id, 'enabled', v)} />
              </label>
              {PRODUCT_SECTION_FIELDS(categories).map((f, i) => {
                if (f.group) {
                  return <p key={`g${i}`} className="pt-3 text-[11px] font-bold uppercase tracking-widest text-neutral-900">{f.group}</p>;
                }
                if (f.showIf && !f.showIf(activePsCfg)) return null;
                return (
                  <FieldControl key={f.key} field={f}
                    value={activePsCfg[f.key] !== undefined ? activePsCfg[f.key] : f.default}
                    onChange={(v) => updatePs(activePsCfg.id, f.key, v)} />
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ── small pieces ────────────────────────────────────────────────────────────
function PanelHeader({ label, onClose, actions }) {
  return (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-neutral-100 bg-white p-4">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Editing</p>
        <p className="mt-0.5 truncate font-sans text-base font-semibold text-neutral-900">{label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        <button onClick={onClose} aria-label="Close panel"
          className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"><X size={16} /></button>
      </div>
    </div>
  );
}

function sectionPath(section, field) {
  if (field.persistedPath) return field.persistedPath;
  if (field.key.startsWith('_')) return null;
  return `${section.path}.${field.key}`;
}

function fixedValue(settings, section, field) {
  const p = sectionPath(section, field);
  if (!p) return null;
  const v = getIn(settings, p);
  return v !== undefined && v !== null ? v : field.default;
}

function Toggle({ checked, onChange }) {
  return (
    <label className="inline-flex cursor-pointer items-center">
      <input type="checkbox" className="peer sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="relative h-6 w-11 rounded-full bg-neutral-200 transition peer-checked:bg-neutral-900 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

function FieldControl({ field, value, onChange }) {
  if (field.type === 'note') {
    return <div className="rounded-lg bg-neutral-50 p-3 text-[12px] leading-relaxed text-neutral-500">{field.label}</div>;
  }
  const v = value !== undefined && value !== null ? value : field.default;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{field.label}</label>
        {field.type === 'range' && (
          <input type="number" min={field.min} max={field.max} value={v ?? field.default}
            onChange={(e) => onChange(clampNum(e.target.value, field.min, field.max))}
            className="w-16 rounded-md border border-neutral-200 px-2 py-1 text-right text-xs" />
        )}
      </div>

      {field.type === 'text' && <input className="input" value={v ?? ''} onChange={(e) => onChange(e.target.value)} />}
      {field.type === 'textarea' && <textarea rows={4} className="input" value={v ?? ''} onChange={(e) => onChange(e.target.value)} />}
      {field.type === 'number' && <input type="number" className="input" value={v ?? 0} onChange={(e) => onChange(Number(e.target.value) || 0)} />}

      {field.type === 'toggle' && (
        <div className="flex items-center gap-2">
          <Toggle checked={!!v} onChange={onChange} />
          <span className="text-sm text-neutral-600">{v ? 'On' : 'Off'}</span>
        </div>
      )}

      {field.type === 'select' && (
        <select className="input" value={v ?? field.default ?? ''} onChange={(e) => onChange(e.target.value)}>
          {field.options.map(([val, lb]) => <option key={String(val)} value={val}>{lb}</option>)}
        </select>
      )}

      {field.type === 'segment' && (
        <div className="flex rounded-lg bg-neutral-100 p-1">
          {field.options.map(([val, lb]) => (
            <button key={String(val)} type="button" onClick={() => onChange(val)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${String(v) === String(val) ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>
              {lb}
            </button>
          ))}
        </div>
      )}

      {field.type === 'color' && (
        <div className="flex items-center gap-2">
          <input type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-neutral-200"
            value={v || '#ffffff'} onChange={(e) => onChange(e.target.value)} />
          <input className="input font-mono text-xs" placeholder="transparent"
            value={v || ''} onChange={(e) => onChange(e.target.value)} />
          {v ? (
            <button type="button" onClick={() => onChange('')} title="Clear"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"><X size={14} /></button>
          ) : null}
        </div>
      )}

      {field.type === 'range' && (
        <input type="range" min={field.min} max={field.max} value={v ?? field.default}
          onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-neutral-900" />
      )}

      {field.type === 'lines' && (
        <textarea rows={4} className="input font-mono text-xs"
          value={Array.isArray(v) ? v.join('\n') : ''} onChange={(e) => onChange(e.target.value.split('\n'))} />
      )}

      {field.type === 'media' && <MediaPicker value={v || ''} onChange={onChange} accept={field.accept} hideUrl />}
    </div>
  );
}

const clampNum = (val, lo, hi) => Math.max(lo, Math.min(hi, Number(val) || lo));
