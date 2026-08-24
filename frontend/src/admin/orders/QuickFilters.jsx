import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '../../api/client';

/* ===========================================================================
 * Quick filters and saved views — editorial text controls, not pills.
 * ========================================================================== */

const PRESETS = [
  { key: 'needs-attention', label: 'Needs attention', hint: 'Payment not verified yet' },
  { key: 'ready-to-ship',   label: 'Ready to ship',   hint: 'Packed and payment settled' },
  { key: 'high-value',      label: 'High value',      hint: 'PKR 50,000 and above' },
  { key: 'delayed',         label: 'Delayed',         hint: 'Stuck in one stage over 24h' },
  { key: 'problem',         label: 'Problem orders',  hint: 'An issue is open' },
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

  const tabCls = (on) =>
    `text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
      on ? 'text-black' : 'text-[#AAAAAA] hover:text-white/75'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {PRESETS.map((p) => {
        const on = active === p.key;
        return (
          <button key={p.key} title={p.hint} aria-pressed={on}
            onClick={() => setFilter({ preset: on ? '' : p.key })}
            className={tabCls(on)}>
            {p.label}
          </button>
        );
      })}

      {views.length > 0 && <span className="h-3 w-px bg-[#EFEFEF]" />}

      {views.map((v) => (
        <span key={v._id} className="group inline-flex items-center gap-1">
          <button onClick={() => applyView(v)} title={v.ownerName ? `Saved by ${v.ownerName}` : 'Saved view'}
            className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#999999] hover:text-black">
            {v.name}
          </button>
          <button onClick={(e) => removeView(v, e)} aria-label={`Delete ${v.name}`}
            className="hidden text-white/25 hover:text-black group-hover:inline">
            <X size={10} />
          </button>
        </span>
      ))}

      {naming ? (
        <span className="inline-flex items-center gap-1.5 border-b border-white/30 py-0.5">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveView(); if (e.key === 'Escape') { setNaming(false); setName(''); } }}
            placeholder="Name this view" className="w-32 bg-transparent text-[12px] text-black outline-none placeholder:text-[#AAAAAA]" />
          <button onClick={saveView} disabled={saving || !name.trim()}
            className="text-[10px] font-medium uppercase tracking-[0.12em] text-black disabled:opacity-40">
            {saving ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
          </button>
          <button onClick={() => { setNaming(false); setName(''); }} aria-label="Cancel"
            className="text-[#AAAAAA] hover:text-black">
            <X size={11} />
          </button>
        </span>
      ) : (
        <button onClick={() => setNaming(true)} title="Save the current filters as a named view"
          className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#AAAAAA] hover:text-[#555555]">
          + Save view
        </button>
      )}
    </div>
  );
}
