import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, ChevronUp, GripVertical, Loader2, Plus, Save, Trash2, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * ADMIN → STOREFRONT → NAVIGATION
 *
 * Shopify-style menu builder for the two navigation surfaces the storefront
 * already reads from settings:
 *   settings.header.menu  → the main bar (label, href, dropdown, highlight)
 *   settings.footer.columns → the footer link columns (title + links)
 *
 * Drag to reorder (native HTML5 DnD — no extra dependency), add/remove rows,
 * and one Save writes both back through the existing PUT /api/settings.
 * The storefront needs ZERO changes: it already reads these exact shapes.
 * ========================================================================== */

const inputCls = 'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-neutral-900';
const labelCls = 'mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500';
const cardCls = 'rounded-2xl border border-neutral-200 bg-white p-5';

const DEFAULT_HEADER = [
  { label: 'Women', href: '/women', dropdown: 'women', highlight: false },
  { label: 'Men', href: '/men', dropdown: 'men', highlight: false },
  { label: 'New Arrivals', href: '/new', dropdown: '', highlight: false },
  { label: 'Best Sellers', href: '/best', dropdown: '', highlight: false },
  { label: 'Sale', href: '/sale', dropdown: '', highlight: true },
];

const DEFAULT_FOOTER = [
  { title: 'Shop', links: [
    { label: 'Women', href: '/women' }, { label: 'Men', href: '/men' },
    { label: 'New Arrivals', href: '/new' }, { label: 'Best Sellers', href: '/best' },
  ] },
  { title: 'Help', links: [
    { label: 'Track Order', href: '/track' }, { label: 'Fit Finder', href: '/fit-finder' },
    { label: 'FAQ', href: '/faq' }, { label: 'My Account', href: '/account' },
  ] },
  { title: 'Policies', links: [
    { label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Service', href: '/terms' },
    { label: 'Returns & Exchanges', href: '/returns' }, { label: 'Shipping Policy', href: '/shipping-policy' },
  ] },
];

/* Native HTML5 drag helpers — reorder a list item by index. */
function useDragReorder(items, setItems) {
  const [dragIdx, setDragIdx] = useState(null);
  return {
    dragIdx,
    onDragStart: (i) => (e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; },
    onDragOver: (i) => (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
    onDrop: (i) => () => {
      if (dragIdx === null || dragIdx === i) { setDragIdx(null); return; }
      const next = [...items];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(i, 0, moved);
      setItems(next);
      setDragIdx(null);
    },
    endDrag: () => setDragIdx(null),
  };
}

export default function Navigation() {
  const { auth, toast } = useApp();

  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [headerMenu, setHeaderMenu] = useState([]);
  const [footerCols, setFooterCols] = useState([]);

  /* ── Load from settings ── */
  useEffect(() => {
    let alive = true;
    api('/settings/admin', { token: auth?.token })
      .then((d) => {
        if (!alive) return;
        const s = d.settings || {};
        const hdr = s.header || {};
        const ftr = s.footer || {};
        setHeaderMenu(Array.isArray(hdr.menu) && hdr.menu.length ? hdr.menu.map((m) => ({ ...m })) : DEFAULT_HEADER);
        setFooterCols(Array.isArray(ftr.columns) && ftr.columns.length ? ftr.columns.map((c) => ({ ...c, links: [...(c.links || [])] })) : DEFAULT_FOOTER);
        setLoaded(true);
      })
      .catch(() => { toast('Could not load settings'); setLoaded(true); });
    return () => { alive = false; };
  }, [auth?.token, toast]);

  const mark = (fn) => { fn(); setDirty(true); };

  /* ── Header menu ops ── */
  const setH = (i, patch) => mark(() => setHeaderMenu((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x))));
  const addHeader = () => mark(() => setHeaderMenu((m) => [...m, { label: '', href: '/', dropdown: '', highlight: false }]));
  const removeHeader = (i) => mark(() => setHeaderMenu((m) => m.filter((_, j) => j !== i)));
  const headerDnD = useDragReorder(headerMenu, (v) => { setHeaderMenu(v); setDirty(true); });

  /* ── Footer ops ── */
  const setCol = (i, patch) => mark(() => setFooterCols((cols) => cols.map((c, j) => (j === i ? { ...c, ...patch } : c))));
  const addCol = () => mark(() => setFooterCols((cols) => [...cols, { title: '', links: [] }]));
  const removeCol = (i) => mark(() => setFooterCols((cols) => cols.filter((_, j) => j !== i)));
  const addLink = (ci) => mark(() => setFooterCols((cols) => cols.map((c, j) => (j === ci ? { ...c, links: [...c.links, { label: '', href: '/' }] } : c))));
  const setLink = (ci, li, patch) => mark(() => setFooterCols((cols) => cols.map((c, j) => (j === ci ? { ...c, links: c.links.map((l, k) => (k === li ? { ...l, ...patch } : l)) } : c))));
  const removeLink = (ci, li) => mark(() => setFooterCols((cols) => cols.map((c, j) => (j === ci ? { ...c, links: c.links.filter((_, k) => k !== li) } : c))));

  const save = async () => {
    setSaving(true);
    try {
      await api('/settings', {
        method: 'PUT', token: auth?.token,
        body: {
          header: { menu: headerMenu.filter((m) => m.label.trim()) },
          footer: { columns: footerCols.map((c) => ({ title: c.title, links: c.links.filter((l) => l.label.trim()) })) },
        },
      });
      toast('Navigation saved');
      setDirty(false);
    } catch (ex) {
      toast(ex.message || 'Could not save navigation');
    }
    setSaving(false);
  };

  const previewMenu = useMemo(() => headerMenu.filter((m) => m.label.trim()), [headerMenu]);

  if (!loaded) {
    return (
      <AdminLayout title="Navigation">
        <div className="grid h-96 place-items-center"><Loader2 size={22} className="animate-spin text-neutral-300" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Navigation">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-sans text-lg font-semibold text-neutral-900">Navigation</h2>
          <p className="mt-0.5 max-w-xl text-[13px] text-neutral-500">
            Build the header menu and footer link columns. Drag to reorder — changes appear on the storefront as soon as you save.
          </p>
        </div>
        <button onClick={save} disabled={saving || !dirty} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-40">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ═══ HEADER MENU ═══ */}
        <div className={cardCls}>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-neutral-900">Header menu</h3>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">{previewMenu.length} links</span>
          </div>
          <p className="mb-4 text-[12px] text-neutral-400">The main bar. A "dropdown" link shows its category submenu automatically.</p>

          <div className="space-y-2">
            {headerMenu.map((m, i) => (
              <div
                key={i}
                draggable
                onDragStart={headerDnD.onDragStart(i)}
                onDragOver={headerDnD.onDragOver(i)}
                onDrop={headerDnD.onDrop(i)}
                onDragEnd={headerDnD.endDrag}
                className={`flex items-center gap-2 rounded-xl border p-2 transition ${headerDnD.dragIdx === i ? 'border-neutral-900 bg-neutral-50 opacity-60' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}
              >
                <span className="cursor-grab text-neutral-300 hover:text-neutral-500" title="Drag to reorder"><GripVertical size={16} /></span>
                <input className="w-36 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-neutral-900" value={m.label} onChange={(e) => setH(i, { label: e.target.value })} placeholder="Label" />
                <input className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-neutral-900" value={m.href} onChange={(e) => setH(i, { href: e.target.value })} placeholder="/path" />
                <select className="w-24 rounded-lg border border-neutral-200 bg-white px-1.5 py-1.5 text-[12px] outline-none" value={m.dropdown || ''} onChange={(e) => setH(i, { dropdown: e.target.value })} title="Dropdown submenu">
                  <option value="">No menu</option>
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                </select>
                <button onClick={() => setH(i, { highlight: !m.highlight })} className={`rounded-lg px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${m.highlight ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`} title="Highlight (accent colour)">
                  Sale
                </button>
                <button onClick={() => removeHeader(i)} className="rounded-lg p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <button onClick={addHeader} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 py-2.5 text-[13px] font-semibold text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900">
            <Plus size={14} /> Add link
          </button>
        </div>

        {/* ═══ FOOTER COLUMNS ═══ */}
        <div className={cardCls}>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-neutral-900">Footer columns</h3>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">{footerCols.length} columns</span>
          </div>
          <p className="mb-4 text-[12px] text-neutral-400">Each column is a heading with links underneath. Drag columns to reorder.</p>

          <div className="space-y-3">
            {footerCols.map((col, ci) => (
                <div key={ci} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button onClick={() => mark(() => setFooterCols((cols) => { const n = [...cols]; if (ci > 0) { [n[ci], n[ci - 1]] = [n[ci - 1], n[ci]]; } return n; }))} disabled={ci === 0} className="rounded p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"><ChevronUp size={14} /></button>
                      <button onClick={() => mark(() => setFooterCols((cols) => { const n = [...cols]; if (ci < n.length - 1) { [n[ci], n[ci + 1]] = [n[ci + 1], n[ci]]; } return n; }))} disabled={ci === footerCols.length - 1} className="rounded p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"><ChevronDown size={14} /></button>
                    </div>
                    <input className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold outline-none focus:border-neutral-900" value={col.title} onChange={(e) => setCol(ci, { title: e.target.value })} placeholder="Column title (e.g. Shop)" />
                    <button onClick={() => removeCol(ci)} className="rounded-lg p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {col.links.map((l, li) => (
                      <div key={li} className="flex items-center gap-2">
                        <input className="w-32 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-neutral-900" value={l.label} onChange={(e) => setLink(ci, li, { label: e.target.value })} placeholder="Label" />
                        <input className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-neutral-900" value={l.href} onChange={(e) => setLink(ci, li, { href: e.target.value })} placeholder="/path" />
                        <button onClick={() => removeLink(ci, li)} className="rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-600"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addLink(ci)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-500 hover:text-neutral-900">
                    <Plus size={12} /> Add link
                  </button>
                </div>
            ))}
          </div>

          <button onClick={addCol} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 py-2.5 text-[13px] font-semibold text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900">
            <Plus size={14} /> Add column
          </button>
        </div>
      </div>

      {/* ── Live shape hint ── */}
      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-[14px] font-bold text-neutral-900">What customers see</h3>
        <p className="mt-1 text-[12px] text-neutral-400">A small preview of how the header links will render (labels only).</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3">
          {previewMenu.length === 0 ? (
            <span className="text-[12px] text-neutral-400">No links yet — add some above.</span>
          ) : previewMenu.map((m, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${m.highlight ? 'text-red-600' : 'text-neutral-700'}`}>
              {m.label || '(no label)'}
              {m.dropdown && <ChevronDown size={11} className="text-neutral-400" />}
            </span>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
