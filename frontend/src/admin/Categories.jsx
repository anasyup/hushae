import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Eye, EyeOff, FolderOpen, Pencil, Plus, Save, Search, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import './products-atelier.css';

/* ===========================================================================
 * Categories — ATELIER luxury theme (same .pa-* family as the Products
 * reference page). All working features preserved + polished: live search,
 * clickable stat views, quick disable/enable, shimmer/empty/error states,
 * ATELIER editor modal with slug preview + image preview + active switch.
 * ========================================================================== */

const EMPTY = { name: '', gender: 'women', description: '', image: '', sortOrder: 0, isActive: true };

const previewSlug = (name) =>
  String(name || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function Categories() {
  const { auth, toast } = useApp();
  const [cats, setCats] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [view, setView] = useState('all'); // all | women | men | disabled
  const [sort, setSort] = useState('order'); // order | name | updated
  const [counts, setCounts] = useState({}); // categorySlug → product count
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setErr('');
    api('/categories?all=1')
      .then((d) => setCats(d.categories))
      .catch(() => { setCats([]); setErr('Something prevented the categories from loading.'); });
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  /* Product count per category — one quiet extra read, aggregated client-side.
     Purely additive: if it fails, the page simply shows no counts. */
  useEffect(() => {
    api('/products/admin/list', { token: auth.token })
      .then((d) => {
        const m = {};
        (d.products || []).forEach((p) => { if (p.categorySlug) m[p.categorySlug] = (m[p.categorySlug] || 0) + 1; });
        setCounts(m);
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  const summary = useMemo(() => {
    const s = { total: 0, women: 0, men: 0, disabled: 0 };
    for (const c of cats || []) {
      s.total++;
      if (!c.isActive) s.disabled++;
      else if (c.gender === 'women') s.women++;
      else if (c.gender === 'men') s.men++;
    }
    return s;
  }, [cats]);

  const filtered = useMemo(() => {
    let list = Array.isArray(cats) ? cats : [];
    if (view === 'women' || view === 'men') list = list.filter((c) => c.isActive && c.gender === view);
    if (view === 'disabled') list = list.filter((c) => !c.isActive);
    const term = q.trim().toLowerCase();
    if (term) list = list.filter((c) => c.name?.toLowerCase().includes(term) || c.slug?.toLowerCase().includes(term));
    if (sort === 'name') list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sort === 'updated') list = [...list].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    else list = [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [cats, view, q, sort]);

  const stats = [
    { label: 'All categories', value: summary.total, key: 'all' },
    { label: 'Women', value: summary.women, key: 'women', note: { text: 'Live', tone: 'pa-note-purple' } },
    { label: 'Men', value: summary.men, key: 'men', note: { text: 'Live', tone: 'pa-note-blue' } },
    { label: 'Disabled', value: summary.disabled, key: 'disabled', note: { text: 'Hidden', tone: 'pa-note-gray' } },
  ];

  const save = async () => {
    if (!editing?.name?.trim()) return;
    setBusy(true);
    try {
      if (editing._id) await api(`/categories/${editing._id}`, { method: 'PUT', token: auth.token, body: editing });
      else await api('/categories', { method: 'POST', token: auth.token, body: editing });
      toast('Category saved');
      setEditing(null);
      load();
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  const disable = async (c) => {
    try { await api(`/categories/${c._id}`, { method: 'DELETE', token: auth.token }); toast(`"${c.name}" disabled`); load(); }
    catch (ex) { toast(ex.message); }
  };
  const enable = async (c) => {
    try { await api(`/categories/${c._id}`, { method: 'PUT', token: auth.token, body: { isActive: true } }); toast(`"${c.name}" is live`); load(); }
    catch (ex) { toast(ex.message); }
  };

  return (
    <AdminLayout title="Categories">
      <div className="pa-outer">
        <div className="pa-wrap">

          {/* ── Page head ─────────────────────────────────────────────── */}
          <div className="pa-head">
            <div>
              <h1>Categories</h1>
              <p>Organize the catalog — storefront navigation follows this order.</p>
            </div>
            <div className="pa-head-actions">
              <button type="button" onClick={() => setEditing({ ...EMPTY })} className="pa-btn-black">
                <Plus size={12} strokeWidth={2.4} /> Add category
              </button>
            </div>
          </div>

          {/* ── Stats = views ─────────────────────────────────────────── */}
          <div className="pa-stats pa-stats-4">
            {stats.map((m) => (
              <button key={m.key} type="button" onClick={() => setView(m.key)} aria-pressed={view === m.key} className={`pa-stat ${view === m.key ? 'active' : ''}`}>
                <p className="pa-stat-label">{m.label}</p>
                <p className="pa-stat-val">{cats === null ? '—' : m.value.toLocaleString()}</p>
                {m.note && <span className={`pa-stat-note ${m.note.tone}`}>{m.note.text}</span>}
              </button>
            ))}
          </div>

          {/* ── Search + sort ──────────────────────────────────────────── */}
          <div className="pa-card pa-toolbar">
            <div className="pa-search">
              <Search size={13} strokeWidth={2} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search categories by name or slug…"
                aria-label="Search categories"
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort categories" className="pa-select">
              <option value="order">Sort · Store order</option>
              <option value="name">Sort · Name A–Z</option>
              <option value="updated">Sort · Recently updated</option>
            </select>
            {(q || view !== 'all') && (
              <button type="button" onClick={() => { setQ(''); setView('all'); }} className="pa-btn-sm" style={{ marginLeft: 'auto' }}>
                Clear
              </button>
            )}
          </div>

          {/* ── States ────────────────────────────────────────────────── */}
          {err && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><AlertTriangle size={18} strokeWidth={1.8} /></div>
              <h3>Unable to load categories</h3>
              <p>{err}</p>
              <button type="button" onClick={() => { setCats(null); load(); }} className="pa-btn-black">Try again</button>
            </div>
          )}

          {cats === null && !err && (
            <div className="pa-card pa-skeleton">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="pa-sk-row" />)}
            </div>
          )}

          {!err && cats !== null && filtered.length === 0 && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><FolderOpen size={18} strokeWidth={1.8} /></div>
              <h3>{q || view !== 'all' ? 'No categories match' : 'No categories yet'}</h3>
              <p>{q || view !== 'all' ? 'Nothing matches this search or view. Clear it or try another.' : 'Create your first category to start organizing the catalog.'}</p>
              {q || view !== 'all'
                ? <button type="button" onClick={() => { setQ(''); setView('all'); }} className="pa-btn-sm">Clear filters</button>
                : <button type="button" onClick={() => setEditing({ ...EMPTY })} className="pa-btn-black"><Plus size={12} strokeWidth={2.4} /> Add category</button>}
            </div>
          )}

          {/* ── Table (≥900px) + mobile cards ─────────────────────────── */}
          {!err && filtered.length > 0 && (
            <>
              <div className="pa-card pa-tbl-card">
                <div className="pa-tbl-scroll">
                  <table className="pa-tbl">
                    <thead>
                      <tr>
                        <th className="pa-th-img" />
                        <th>Category</th>
                        <th style={{ width: '11%' }}>Gender</th>
                        <th style={{ width: '9%' }}>Order</th>
                        <th style={{ width: '11%' }}>Status</th>
                        <th className="pa-hide-xl" style={{ width: '12%' }}>Updated</th>
                        <th style={{ width: '96px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => (
                        <tr key={c._id} style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s`, opacity: c.isActive ? 1 : 0.62 }}>
                          <td><Img src={c.image} alt="" className="pa-thumb" /></td>
                          <td style={{ minWidth: 0 }}>
                            <span className="pa-name" style={{ cursor: 'default' }}>{c.name}</span>
                            <span className="pa-sub">{c.slug} · {counts[c.slug] || 0} product{counts[c.slug] === 1 ? '' : 's'}{c.description ? ` · ${c.description}` : ''}</span>
                          </td>
                          <td>
                            <span className={`pa-badge ${c.gender === 'women' ? 'pa-b-purple' : 'pa-b-blue'}`}>
                              <span className="pa-dot" aria-hidden />{c.gender === 'women' ? 'Women' : 'Men'}
                            </span>
                          </td>
                          <td><span className="pa-cell-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.sortOrder}</span></td>
                          <td>
                            {c.isActive
                              ? <span className="pa-badge pa-b-green"><span className="pa-dot" aria-hidden />Active</span>
                              : <span className="pa-badge pa-b-gray"><span className="pa-dot" aria-hidden />Disabled</span>}
                          </td>
                          <td className="pa-hide-xl"><span className="pa-cell-muted">{c.updatedAt ? fmtDate(c.updatedAt) : '—'}</span></td>
                          <td>
                            <div className="pa-row-actions">
                              <button type="button" onClick={() => setEditing({ ...c })} className="pa-action-btn" aria-label={`Edit ${c.name}`} title="Edit">
                                <Pencil size={12} strokeWidth={2} />
                              </button>
                              {c.isActive ? (
                                <button type="button" onClick={() => disable(c)} className="pa-action-btn danger" aria-label={`Disable ${c.name}`} title="Disable">
                                  <EyeOff size={12} strokeWidth={2} />
                                </button>
                              ) : (
                                <button type="button" onClick={() => enable(c)} className="pa-action-btn" aria-label={`Enable ${c.name}`} title="Enable">
                                  <Eye size={12} strokeWidth={2} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pa-mcards">
                {filtered.map((c) => (
                  <div key={c._id} className="pa-mcard" style={{ opacity: c.isActive ? 1 : 0.62 }}>
                    <Img src={c.image} alt="" className="pa-mcard-img" />
                    <div className="pa-mcard-main">
                      <span className="pa-name" style={{ cursor: 'default' }}>{c.name}</span>
                      <span className="pa-sub">{c.slug} · {counts[c.slug] || 0} product{counts[c.slug] === 1 ? '' : 's'}</span>
                      <div className="pa-mcard-row">
                        <span className={`pa-badge ${c.gender === 'women' ? 'pa-b-purple' : 'pa-b-blue'}`}>
                          <span className="pa-dot" aria-hidden />{c.gender === 'women' ? 'Women' : 'Men'}
                        </span>
                        {c.isActive
                          ? <span className="pa-badge pa-b-green"><span className="pa-dot" aria-hidden />Active</span>
                          : <span className="pa-badge pa-b-gray"><span className="pa-dot" aria-hidden />Disabled</span>}
                      </div>
                      <div className="pa-mcard-row">
                        <span className="pa-cell-muted">Order {c.sortOrder}</span>
                        <div className="pa-row-actions">
                          <button type="button" onClick={() => setEditing({ ...c })} className="pa-action-btn" aria-label={`Edit ${c.name}`}>
                            <Pencil size={12} strokeWidth={2} />
                          </button>
                          {c.isActive ? (
                            <button type="button" onClick={() => disable(c)} className="pa-action-btn danger" aria-label={`Disable ${c.name}`}>
                              <EyeOff size={12} strokeWidth={2} />
                            </button>
                          ) : (
                            <button type="button" onClick={() => enable(c)} className="pa-action-btn" aria-label={`Enable ${c.name}`}>
                              <Eye size={12} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Editor modal (ATELIER) ──────────────────────────────────────── */}
      {editing && (
        <div className="pa-modal-overlay" onClick={() => !busy && setEditing(null)}>
          <div className="pa-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editing._id ? 'Edit category' : 'New category'}>
            <div className="pa-modal-head">
              <div>
                <h3>{editing._id ? 'Edit category' : 'New category'}</h3>
                <p>{editing._id ? `slug: ${editing.slug}` : 'Appears in storefront navigation once saved'}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} disabled={busy} className="pa-action-btn" aria-label="Close">
                <X size={13} strokeWidth={2.2} />
              </button>
            </div>

            <div className="pa-modal-body">
              <div className="pa-field">
                <label className="pa-field-label" htmlFor="cat-name">Name *</label>
                <input id="cat-name" className="pa-modal-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Briefs" autoFocus />
                {!editing._id && editing.name && (
                  <p className="pa-field-hint">slug will be <code>{previewSlug(editing.name) || '…'}</code></p>
                )}
              </div>

              <div className="pa-field">
                <p className="pa-field-label">Gender *</p>
                <div className="pa-modal-seg cols-2">
                  <button type="button" className={editing.gender === 'women' ? 'on' : ''} onClick={() => setEditing({ ...editing, gender: 'women' })}>Women</button>
                  <button type="button" className={editing.gender === 'men' ? 'on' : ''} onClick={() => setEditing({ ...editing, gender: 'men' })}>Men</button>
                </div>
              </div>

              <div className="pa-field">
                <label className="pa-field-label" htmlFor="cat-desc">Description</label>
                <textarea id="cat-desc" className="pa-textarea" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="One quiet line about this category…" />
              </div>

              <div className="pa-field">
                <label className="pa-field-label" htmlFor="cat-img">Image URL</label>
                <input id="cat-img" className="pa-modal-input" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }} value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="/images/categories/briefs.jpg" />
                {editing.image && (
                  <div className="pa-img-preview">
                    <Img src={editing.image} alt="" />
                    <span>Preview — how the tile renders in the storefront</span>
                  </div>
                )}
              </div>

              <div className="pa-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
                <div>
                  <label className="pa-field-label" htmlFor="cat-order">Sort order</label>
                  <input id="cat-order" className="pa-modal-input" type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} />
                </div>
                <div className="pa-switch-row">
                  <div>
                    <p className="pa-switch-label" style={{ margin: 0 }}>Active</p>
                    <p className="pa-switch-desc" style={{ margin: 0 }}>Visible in the storefront</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!editing.isActive}
                    aria-label="Category active"
                    className={`pa-switch ${editing.isActive ? 'on' : ''}`}
                    onClick={() => setEditing({ ...editing, isActive: !editing.isActive })}
                  />
                </div>
              </div>
            </div>

            <div className="pa-modal-foot">
              <p className="pa-modal-note">{editing._id ? 'Changes apply immediately after save' : 'Slug is generated from the name'}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setEditing(null)} disabled={busy} className="pa-btn-sm">Cancel</button>
                <button type="button" onClick={save} disabled={busy || !editing.name?.trim()} className="pa-btn-black">
                  <Save size={12} strokeWidth={2.2} /> {busy ? 'Saving…' : 'Save category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
