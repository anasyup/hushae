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

  return (
    <div className="od-views" role="group" aria-label="Saved views">
      <span className="od-views-label">Views</span>
      {PRESETS.map((p) => {
        const on = active === p.key;
        return (
          <button key={p.key} type="button" title={p.hint} aria-pressed={on}
            onClick={() => setFilter({ preset: on ? '' : p.key })}
            className={`od-chip ${on ? 'active' : ''}`}>
            {p.label}
          </button>
        );
      })}

      {views.map((v) => (
        <span key={v._id} className="od-chipwrap">
          <button type="button" onClick={() => applyView(v)}
            title={v.ownerName ? `Saved by ${v.ownerName}` : 'Saved view'}
            className="od-chip saved">
            {v.name}
          </button>
          <button type="button" onClick={(e) => removeView(v, e)} aria-label={`Delete ${v.name}`} className="od-chip-x">
            <X size={10} />
          </button>
        </span>
      ))}

      {naming ? (
        <span className="od-chipwrap">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveView(); if (e.key === 'Escape') { setNaming(false); setName(''); } }}
            placeholder="View name"
            aria-label="View name"
            className="od-chip-input"
          />
          <button type="button" onClick={saveView} disabled={saving || !name.trim()} className="od-chip save">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => { setNaming(false); setName(''); }} aria-label="Cancel" className="od-chip-x">
            <X size={11} />
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setNaming(true)} className="od-chip ghost"
          title="Save the current filters as a named view">
          + Save view
        </button>
      )}
    </div>
  );
}
