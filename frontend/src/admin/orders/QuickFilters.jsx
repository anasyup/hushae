import { useEffect, useState } from 'react';
import {
  AlertOctagon, Banknote, BookmarkPlus, Clock, Gem, Loader2, PackageCheck, Star, Trash2, X,
} from 'lucide-react';
import { api } from '../../api/client';

/* ============================================================================
 * Quick filters and saved views.
 *
 * Presets are one-click answers to the questions the desk asks all day.
 * Saved views are whatever combination the merchant builds themselves, stored
 * server-side so the whole team gets them and a URL can be shared.
 * ========================================================================== */

const PRESETS = [
  { key: 'needs-attention', label: 'Needs attention', icon: AlertOctagon, hint: 'Payment not verified yet' },
  { key: 'ready-to-ship',   label: 'Ready to ship',   icon: PackageCheck, hint: 'Packed and payment settled' },
  { key: 'high-value',      label: 'High value',      icon: Gem,          hint: 'PKR 50,000 and above' },
  { key: 'delayed',         label: 'Delayed',         icon: Clock,        hint: 'Stuck in one stage over 24h' },
  { key: 'problem',         label: 'Problem orders',  icon: AlertOctagon, hint: 'An issue is open' },
];

export default function QuickFilters({ filters, setFilter, token, currentQuery, toast }) {
  const [views, setViews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const loadViews = () => {
    if (!token) return;
    api('/orders/insights/filters', { token })
      .then((d) => setViews(d.views || []))
      .catch(() => {});
  };
  useEffect(loadViews, [token]);

  const active = filters.preset || '';

  const saveView = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await api('/orders/insights/filters', {
        method: 'POST', token, body: { name: trimmed, query: currentQuery },
      });
      toast?.(`Saved “${trimmed}”`);
      setNaming(false); setName('');
      loadViews();
    } catch (e) {
      toast?.(e.message || 'Could not save the view');
    } finally { setSaving(false); }
  };

  const applyView = (v) => {
    api(`/orders/insights/filters/${v._id}/used`, { method: 'PATCH', token }).catch(() => {});
    const params = new URLSearchParams(v.query);
    const patch = {};
    ['group', 'stage', 'paymentMethod', 'paymentState', 'q', 'from', 'to',
      'minTotal', 'maxTotal', 'city', 'printed', 'hasIssue', 'sort', 'preset'].forEach((k) => {
      patch[k] = params.get(k) || '';
    });
    setFilter(patch);
  };

  const removeView = async (v, e) => {
    e.stopPropagation();
    if (!confirm(`Delete the saved view “${v.name}”?`)) return;
    try {
      await api(`/orders/insights/filters/${v._id}`, { method: 'DELETE', token });
      loadViews();
    } catch { /* noop */ }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => {
        const on = active === p.key;
        return (
          <button key={p.key} title={p.hint} aria-pressed={on}
            onClick={() => setFilter({ preset: on ? '' : p.key })}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ${
              on ? 'border-neutral-900 bg-neutral-900 text-white'
                 : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'}`}>
            <p.icon size={12} /> {p.label}
          </button>
        );
      })}

      {views.length > 0 && <span className="mx-1 h-5 w-px bg-neutral-200" />}

      {views.map((v) => (
        <span key={v._id} className="group relative">
          <button onClick={() => applyView(v)} title={v.ownerName ? `Saved by ${v.ownerName}` : 'Saved view'}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white py-1.5 pl-3 pr-7 text-[12.5px] font-medium text-neutral-600 transition hover:border-neutral-400">
            <Star size={11} className="text-amber-500" fill="currentColor" /> {v.name}
          </button>
          <button onClick={(e) => removeView(v, e)} aria-label={`Delete ${v.name}`}
            className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 text-neutral-300 hover:text-red-600 group-hover:block">
            <Trash2 size={11} />
          </button>
        </span>
      ))}

      {naming ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-900 bg-white py-1 pl-3 pr-1">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveView(); if (e.key === 'Escape') { setNaming(false); setName(''); } }}
            placeholder="Name this view" className="w-32 text-[12.5px] outline-none" />
          <button onClick={saveView} disabled={saving || !name.trim()}
            className="rounded-full bg-neutral-900 px-2.5 py-1 text-[11.5px] font-semibold text-white disabled:opacity-40">
            {saving ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
          </button>
          <button onClick={() => { setNaming(false); setName(''); }} aria-label="Cancel"
            className="grid h-6 w-6 place-items-center text-neutral-400 hover:text-neutral-900">
            <X size={12} />
          </button>
        </span>
      ) : (
        <button onClick={() => setNaming(true)} title="Save the current filters as a named view"
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-neutral-300 px-3 py-1.5 text-[12.5px] font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900">
          <BookmarkPlus size={12} /> Save view
        </button>
      )}
    </div>
  );
}
