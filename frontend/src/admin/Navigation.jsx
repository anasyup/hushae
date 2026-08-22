import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Save, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnIcon, btnSolid, ctl, TableSkeleton } from './orders/orderUi';

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

  const setH = (i, patch) => mark(() => setHeaderMenu((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x))));
  const addHeader = () => mark(() => setHeaderMenu((m) => [...m, { label: '', href: '/', dropdown: '', highlight: false }]));
  const removeHeader = (i) => mark(() => setHeaderMenu((m) => m.filter((_, j) => j !== i)));
  const headerDnD = useDragReorder(headerMenu, (v) => { setHeaderMenu(v); setDirty(true); });

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
        <PageHeader title="Navigation" description="Header menu and footer columns." />
        <TableSkeleton rows={6} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Navigation">
      <PageHeader
        title="Navigation"
        description="Build the header menu and footer link columns. Drag to reorder — changes appear on the storefront as soon as you save."
        actions={(
          <button type="button" onClick={save} disabled={saving || !dirty} className={btnSolid}>
            <Save size={12} /> {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Menus</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-white/10">
          <div className="px-5 py-6">
            <p className="adm-label">Header links</p>
            <p className="adm-metric mt-3 text-[28px] text-white">{previewMenu.length}</p>
          </div>
          <div className="px-5 py-6">
            <p className="adm-label">Footer columns</p>
            <p className="adm-metric mt-3 text-[28px] text-white">{footerCols.length}</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Menu structure</p>
        <p className="mb-4 text-[12px] text-white/35">The main bar. A dropdown link shows its category submenu automatically.</p>
        <div className="space-y-2">
          {headerMenu.map((m, i) => (
            <div
              key={i}
              draggable
              onDragStart={headerDnD.onDragStart(i)}
              onDragOver={headerDnD.onDragOver(i)}
              onDrop={headerDnD.onDrop(i)}
              onDragEnd={headerDnD.endDrag}
              className={`flex flex-wrap items-center gap-2 border-b border-white/5 py-2 ${headerDnD.dragIdx === i ? 'opacity-40' : ''}`}
            >
              <span className="cursor-grab text-white/25" title="Drag to reorder"><GripVertical size={14} /></span>
              <input className={`${ctl} w-32`} value={m.label} onChange={(e) => setH(i, { label: e.target.value })} placeholder="Label" />
              <input className={`${ctl} min-w-0 flex-1`} value={m.href} onChange={(e) => setH(i, { href: e.target.value })} placeholder="/path" />
              <select className={`${ctl} w-28`} value={m.dropdown || ''} onChange={(e) => setH(i, { dropdown: e.target.value })} title="Dropdown submenu">
                <option value="">No menu</option>
                <option value="women">Women</option>
                <option value="men">Men</option>
              </select>
              <button type="button" onClick={() => setH(i, { highlight: !m.highlight })} className={m.highlight ? btnSolid : btnGhost} title="Highlight (accent colour)">
                Sale
              </button>
              <button type="button" onClick={() => removeHeader(i)} className={btnIcon} aria-label="Remove link">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addHeader} className={`${btnGhost} mt-4`}>
          <Plus size={12} /> Add link
        </button>
      </section>

      <section className="mb-10">
        <p className="adm-index">03 — Footer</p>
        <p className="mb-4 text-[12px] text-white/35">Each column is a heading with links underneath.</p>
        <div className="space-y-6">
          {footerCols.map((col, ci) => (
            <div key={ci} className="border-y border-white/10 py-4">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button type="button" onClick={() => mark(() => setFooterCols((cols) => { const n = [...cols]; if (ci > 0) { [n[ci], n[ci - 1]] = [n[ci - 1], n[ci]]; } return n; }))} disabled={ci === 0} className="text-white/30 disabled:opacity-20"><ChevronUp size={14} /></button>
                  <button type="button" onClick={() => mark(() => setFooterCols((cols) => { const n = [...cols]; if (ci < n.length - 1) { [n[ci], n[ci + 1]] = [n[ci + 1], n[ci]]; } return n; }))} disabled={ci === footerCols.length - 1} className="text-white/30 disabled:opacity-20"><ChevronDown size={14} /></button>
                </div>
                <input className={ctl} value={col.title} onChange={(e) => setCol(ci, { title: e.target.value })} placeholder="Column title (e.g. Shop)" />
                <button type="button" onClick={() => removeCol(ci)} className={btnIcon} aria-label="Remove column">×</button>
              </div>
              <div className="mt-3 space-y-2 pl-8">
                {col.links.map((l, li) => (
                  <div key={li} className="flex items-center gap-2">
                    <input className={`${ctl} w-32`} value={l.label} onChange={(e) => setLink(ci, li, { label: e.target.value })} placeholder="Label" />
                    <input className={`${ctl} min-w-0 flex-1`} value={l.href} onChange={(e) => setLink(ci, li, { href: e.target.value })} placeholder="/path" />
                    <button type="button" onClick={() => removeLink(ci, li)} className={btnIcon} aria-label="Remove footer link"><X size={12} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addLink(ci)} className={`${btnGhost} mt-3 ml-8`}>
                <Plus size={12} /> Add link
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addCol} className={`${btnGhost} mt-4`}>
          <Plus size={12} /> Add column
        </button>
      </section>

      <section>
        <p className="adm-index">04 — Preview</p>
        <p className="mb-3 text-[12px] text-white/35">Labels only — how the header links will render.</p>
        <div className="flex flex-wrap items-center gap-4 border-y border-white/10 py-4">
          {previewMenu.length === 0 ? (
            <span className="text-[12px] text-white/35">No links yet — add some above.</span>
          ) : previewMenu.map((m, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 text-[12px] ${m.highlight ? 'text-white' : 'text-white/60'}`}>
              {m.label || '(no label)'}
              {m.dropdown && <ChevronDown size={11} className="text-white/30" />}
            </span>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
