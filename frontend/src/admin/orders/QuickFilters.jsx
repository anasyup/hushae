import { useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { api } from '../../api/client';
import s from './adesk.module.css';

/* ===========================================================================
 * Quick filters + saved views — ATELIER pill row (same language as the
 * Overview range tabs). Behaviour unchanged: presets and saved views both
 * write straight into the URL-backed filter object.
 * ========================================================================== */

const cx = (...cls) => cls.filter(Boolean).join('');

const PRESETS = [
  { key: 'needs-attention', label: 'Needs attention', hint: 'Payment not verified yet' },
  { key: 'ready-to-ship', label: 'Ready to ship', hint: 'Packed and payment settled' },
  { key: 'high-value', label: 'High value', hint: 'PKR 50,000 and above' },
  { key: 'delayed', label: 'Delayed', hint: 'Stuck in one stage over 24h' },
  { key: 'problem', label: 'Problem orders', hint: 'An issue is open' },
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
    <div className={s.viewRow}>
      <span className={s.ctlLabel} style={{ margin: 0 }}>Views</span>
      {PRESETS.map((p) => {
        const on = active === p.key;
        return (
          <button key={p.key} type="button" title={p.hint} aria-pressed={on}
            onClick={() => setFilter({ preset: on ? '' : p.key })}
            className={cx(s.tab, on && s.tabOn)}>
            {p.label}
          </button>
        );
      })}

      {views.length > 0 && <span className={s.viewGap} aria-hidden />}

      {views.map((v) => (
        <span key={v._id} className={cx(s.tab, filters.preset === v.name && s.tabOn)} style={{ paddingRight: 4 }}>
          <button type="button" onClick={() => applyView(v)} title={v.ownerName ? `Saved by ${v.ownerName}` : 'Saved view'}
            style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
            {v.name}
          </button>
          <button type="button" className={s.tabX} aria-label={`Delete ${v.name}`} onClick={(e) => removeView(v, e)}>
            <X size={10} />
          </button>
        </span>
      ))}

      {naming ? (
        <span className={s.nameWrap}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveView(); if (e.key === 'Escape') { setNaming(false); setName(''); } }}
            placeholder="Name this view" aria-label="Saved view name" />
          <button type="button" className={s.tabX} onClick={saveView} disabled={saving || !name.trim()} aria-label="Save view" style={{ opacity: saving || !name.trim() ? .4 : .7 }}>
            {saving ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
          </button>
          <button type="button" className={s.tabX} aria-label="Cancel naming" onClick={() => { setNaming(false); setName(''); }}>
            <X size={11} />
          </button>
        </span>
      ) : (
        <button type="button" className={s.tab} onClick={() => setNaming(true)} title="Save the current filters as a named view">
          <Plus size={10} /> Save view
        </button>
      )}
    </div>
  );
}
