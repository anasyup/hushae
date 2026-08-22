import { useEffect, useMemo, useState } from 'react';
import { Check, GripVertical, Plus, Search, X } from 'lucide-react';
import type { Field, SettingValue } from '../core/types';
import { api } from '../../api/client';

/* ============================================================================
 * Live-data pickers: products, collections, pages, blogs, menus.
 * Single and multi-select share one component; `field.type` decides.
 * ========================================================================== */

const MULTI = new Set(['product_list', 'collection_list', 'link_list']);

const ENDPOINT: Record<string, string> = {
  product: '/products?limit=60',
  product_list: '/products?limit=60',
  collection: '/categories',
  collection_list: '/categories',
  page: '/settings',
  blog: '/settings',
  article: '/settings',
  link_list: '/categories',
};

interface Row { id: string; label: string; sub?: string; image?: string }

export function ResourcePicker({ field, value, onChange }: { field: Field; value: SettingValue; onChange: (v: SettingValue) => void }) {
  const multi = MULTI.has(field.type);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');
  const [drag, setDrag] = useState<number | null>(null);

  useEffect(() => {
    if (!open || rows) return;
    const url = ENDPOINT[field.type] || '/products?limit=40';
    api(url)
      .then((d: any) => {
        if (field.type.startsWith('product')) {
          setRows((d.products || []).map((p: any) => ({
            id: p.slug || p._id, label: p.name,
            sub: `PKR ${Number(p.price || 0).toLocaleString('en-PK')}`,
            image: p.images?.[0]?.url || p.images?.[0],
          })));
        } else if (field.type.startsWith('collection') || field.type === 'link_list') {
          setRows((d.categories || []).map((c: any) => ({ id: c.slug, label: c.name, sub: c.gender, image: c.image })));
        } else {
          setRows([
            { id: '/faq', label: 'FAQ' }, { id: '/privacy', label: 'Privacy Policy' },
            { id: '/terms', label: 'Terms of Service' }, { id: '/returns', label: 'Returns & Exchanges' },
            { id: '/shipping-policy', label: 'Shipping Policy' },
          ]);
        }
      })
      .catch(() => setRows([]));
  }, [open, rows, field.type]);

  const selected = useMemo<string[]>(
    () => (multi ? (Array.isArray(value) ? (value as string[]) : []) : value ? [String(value)] : []),
    [value, multi],
  );

  const filtered = (rows || []).filter((r) => r.label.toLowerCase().includes(q.toLowerCase()));

  const toggle = (id: string) => {
    if (!multi) { onChange(id); setOpen(false); return; }
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const labelFor = (id: string) => rows?.find((r) => r.id === id)?.label || id;

  return (
    <div>
      {selected.length > 0 && (multi ? (
        // Hand-picked lists are order-sensitive — drag to arrange, the
        // storefront renders them in exactly this sequence.
        <div className="mb-2 space-y-1">
          {selected.map((id, i) => (
            <div
              key={id}
              draggable
              onDragStart={() => setDrag(i)}
              onDragEnd={() => setDrag(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag === null || drag === i) return;
                const next = [...selected];
                const [item] = next.splice(drag, 1);
                next.splice(i, 0, item);
                onChange(next);
                setDrag(null);
              }}
              className={`flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-1.5 py-1 ${drag === i ? 'opacity-40' : ''}`}
            >
              <GripVertical size={11} className="shrink-0 cursor-grab text-neutral-300 active:cursor-grabbing" />
              <span className="w-4 shrink-0 text-center text-[13px] font-semibold text-neutral-400">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-xs">{labelFor(id)}</span>
              <button onClick={() => toggle(id)} className="shrink-0 text-neutral-400 hover:text-white">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs">
              {labelFor(id)}
              <button onClick={() => onChange('')} className="text-neutral-400 hover:text-neutral-900">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      ))}

      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-2 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900">
        <Plus size={13} /> {selected.length ? 'Change selection' : `Select ${field.type.replace('_list', '').replace('_', ' ')}`}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2">
            <Search size={13} className="text-neutral-400" />
            <input autoFocus className="w-full text-xs outline-none" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-900"><X size={13} /></button>
          </div>
          <div className="te-scroll max-h-64 overflow-y-auto p-1">
            {rows === null && <p className="p-4 text-center text-xs text-neutral-400">Loading…</p>}
            {rows?.length === 0 && <p className="p-4 text-center text-xs text-neutral-400">Nothing found</p>}
            {filtered.map((r) => {
              const on = selected.includes(r.id);
              return (
                <button key={r.id} type="button" onClick={() => toggle(r.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${on ? 'bg-[#FFFFFF]/8' : 'hover:bg-neutral-50'}`}>
                  {r.image
                    ? <img src={r.image} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                    : <span className="h-8 w-8 shrink-0 rounded bg-neutral-100" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{r.label}</span>
                    {r.sub && <span className="block truncate text-[13px] text-neutral-400">{r.sub}</span>}
                  </span>
                  {on && <Check size={13} className="shrink-0 text-[#FFFFFF]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
