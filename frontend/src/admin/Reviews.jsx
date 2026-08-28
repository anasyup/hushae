import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Check, ExternalLink, MessageSquare, Search, Sparkles, Star, Trash2, X,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import './products-atelier.css';

/* ===========================================================================
 * Reviews — ATELIER luxury theme (same .pa-* family as Products / Categories
 * / Collections). Moderation workflow preserved 1:1: tabs with live counts,
 * select-all + bulk (approve/reject/feature/pin/verify/delete), per-row
 * approve/reject/reply/delete, inline public reply, client search.
 * ========================================================================== */

function Stars({ n }) {
  return (
    <span className="pa-stars" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          strokeWidth={1.6}
          color={i <= n ? '#111111' : '#dcdcdc'}
          fill={i <= n ? '#111111' : 'none'}
        />
      ))}
    </span>
  );
}

function Badge({ tone, children }) {
  return <span className={`pa-badge ${tone}`}><span className="pa-dot" aria-hidden />{children}</span>;
}

/* Pagination window: 1 … current±1 … last (reference bar behaviour). */
function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = [1, 2, page - 1, page, page + 1, pages - 1, pages]
    .filter((p) => p >= 1 && p <= pages);
  const uniq = [...new Set(keep)].sort((a, b) => a - b);
  const out = [];
  uniq.forEach((p, i) => { if (i > 0 && p - uniq[i - 1] > 1) out.push('…'); out.push(p); });
  return out;
}

export default function Reviews() {
  const { auth, toast } = useApp();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [busy, setBusy] = useState(null);
  const [replying, setReplying] = useState(null);
  const [reply, setReply] = useState('');
  const [selected, setSelected] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState(''); // debounced search → server-side now
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);
  const [total, setTotal] = useState(0);
  const [pulse, setPulse] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [barsOn, setBarsOn] = useState(false);

  /* Server-side pagination + search + sort: the list stays fast no matter
     how many reviews the store accumulates — no more 500-row scroll. */
  const load = () => {
    setErr('');
    setLoaded(false);
    const sp = new URLSearchParams({ status: tab, page: String(page), per: String(per), sort });
    if (dq) sp.set('q', dq);
    api(`/reviews/admin?${sp}`, { token: auth?.token })
      .then((d) => { setRows(d.reviews || []); setCounts(d.counts || {}); setTotal(d.total || 0); setSelected([]); })
      .catch(() => { setRows([]); setTotal(0); setErr('Something prevented the reviews from loading.'); })
      .finally(() => setLoaded(true));
    api('/reviews/admin/stats', { token: auth?.token }).then(setPulse).catch(() => {});
  };

  /* One-shot sample data — reviews from delivered orders (backend links real
     orders + customers, verified). Refuses to run twice; toasts the truth. */
  const seedDemo = async () => {
    setSeeding(true);
    try {
      const r = await api('/reviews/admin/seed-demo', { method: 'POST', token: auth.token, body: {} });
      toast(`${r.created} sample reviews added (${r.linked} from delivered orders)`);
      load();
    } catch (e) { toast(e.message || 'Could not add sample reviews'); }
    setSeeding(false);
  };

  useEffect(() => {
    if (!pulse) return undefined;
    const t = setTimeout(() => setBarsOn(true), 150);
    return () => clearTimeout(t);
  }, [pulse]);

  const toggleOne = (id) => setSelected((s2) => (s2.includes(id) ? s2.filter((x) => x !== id) : [...s2, id]));
  const allChecked = rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => setSelected(allChecked ? [] : rows.map((r) => r._id));

  const bulk = async (action) => {
    if (!selected.length) return;
    if (action === 'delete' && !window.confirm(`Delete ${selected.length} review(s) permanently?`)) return;
    setBusy('bulk');
    try {
      const r = await api('/reviews/admin/bulk', { method: 'POST', body: { ids: selected, action }, token: auth.token });
      toast(`${r.affected} review${r.affected === 1 ? '' : 's'} updated`);
      load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(null); }
  };

  /* Debounce the search box, reset to page 1 whenever the view changes. */
  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { setPage(1); }, [tab, sort, per]);
  useEffect(() => { if (auth?.token) load(); /* eslint-disable-next-line */ }, [tab, auth?.token, page, per, sort, dq]);

  const setStatus = async (id, status) => {
    setBusy(id);
    try {
      await api(`/reviews/admin/${id}`, { method: 'PATCH', body: { status }, token: auth.token });
      toast(status === 'approved' ? 'Review approved' : 'Review rejected');
      load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(null); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    setBusy(id);
    try {
      await api(`/reviews/admin/${id}`, { method: 'DELETE', token: auth.token });
      toast('Deleted'); load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(null); }
  };

  const saveReply = async () => {
    if (!replying) return;
    setBusy(replying);
    try {
      await api(`/reviews/admin/${replying}`, { method: 'PATCH', body: { adminReply: reply }, token: auth.token });
      toast('Reply saved'); setReplying(null); setReply(''); load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(null); }
  };

  /* The page IS the server slice — nothing to filter or sort client-side. */
  const filtered = rows;
  const pageCount = Math.max(1, Math.ceil(total / per));

  const stats = [
    { id: 'pending', label: 'Pending', note: { text: 'Needs you', tone: 'pa-note-yellow' } },
    { id: 'approved', label: 'Approved', note: { text: 'Public', tone: 'pa-note-green' } },
    { id: 'rejected', label: 'Rejected', note: { text: 'Hidden', tone: 'pa-note-gray' } },
  ];

  const emptyCopy = {
    pending: 'When a customer writes a review it will land here for your approval.',
    approved: 'Approved reviews appear on the product page publicly.',
    rejected: 'Rejected reviews stay in the database but never show publicly.',
  };

  return (
    <AdminLayout title="Reviews">
      <div className="pa-outer">
        <div className="pa-wrap">

          {/* ── Page head ─────────────────────────────────────────────── */}
          <div className="pa-head">
            <div>
              <h1>Reviews</h1>
              <p>Moderate customer reviews before they appear on product pages.</p>
            </div>
            <div className="pa-head-actions">
              <button type="button" onClick={seedDemo} disabled={seeding} className="pa-btn-sm" title="One-shot: adds 16 realistic reviews from delivered orders">
                <Sparkles size={12} strokeWidth={2} /> {seeding ? 'Adding…' : 'Sample reviews'}
              </button>
            </div>
          </div>

          {/* ── Stats = tabs ──────────────────────────────────────────── */}
          <div className="pa-stats pa-stats-3">
            {stats.map((t, i) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={`pa-stat ${tab === t.id ? 'active' : ''}`} style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
                <p className="pa-stat-label">{t.label}</p>
                <p className="pa-stat-val">{!loaded ? '—' : (counts[t.id] || 0).toLocaleString()}</p>
                <span className={`pa-stat-note ${t.note.tone}`}>{t.note.text}</span>
              </button>
            ))}
          </div>

          {/* ── Rating pulse (approved reviews) ───────────────────────── */}
          {pulse && pulse.totalApproved > 0 && (
            <div className="pa-card pa-pulse">
              <div className="pa-pulse-avg">
                <p className="pa-pulse-avg-val">{pulse.avg.toFixed(1)}</p>
                <div style={{ margin: '7px 0 6px' }}><Stars n={Math.round(pulse.avg)} /></div>
                <p className="pa-pulse-label">{pulse.totalApproved} approved review{pulse.totalApproved === 1 ? '' : 's'}</p>
              </div>
              <div className="pa-pulse-bars">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = pulse.rating?.[star] || 0;
                  const pct = pulse.totalApproved ? Math.round((n / pulse.totalApproved) * 100) : 0;
                  return (
                    <div key={star} className="pa-pulse-bar-row">
                      <span>{star} ★</span>
                      <div className="pa-pulse-track">
                        <div className="pa-pulse-bar" style={{ width: barsOn ? `${pct}%` : '0%' }} />
                      </div>
                      <span>{n}</span>
                    </div>
                  );
                })}
              </div>
              <div className="pa-pulse-facts">
                <div>
                  <p className="pa-pulse-fact-val">{pulse.last30Days || 0}</p>
                  <p className="pa-pulse-fact-label">Last 30 days</p>
                </div>
                <div>
                  <p className={`pa-pulse-fact-val ${pulse.reported > 0 ? 'warn' : ''}`}>{pulse.reported || 0}</p>
                  <p className="pa-pulse-fact-label">Reported</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Search + sort ─────────────────────────────────────────── */}
          <div className="pa-card pa-toolbar">
            <div className="pa-search">
              <Search size={13} strokeWidth={2} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search reviews by customer, text or product…"
                aria-label="Search reviews"
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort reviews" className="pa-select">
              <option value="newest">Sort · Newest</option>
              <option value="oldest">Sort · Oldest</option>
              <option value="highest">Sort · Highest rated</option>
              <option value="lowest">Sort · Lowest rated</option>
              <option value="helpful">Sort · Most helpful</option>
            </select>
            {q && (
              <button type="button" onClick={() => setQ('')} className="pa-btn-sm" style={{ marginLeft: 'auto' }}>Clear</button>
            )}
          </div>

          {/* ── Bulk bar ──────────────────────────────────────────────── */}
          {selected.length > 0 && (
            <div className="pa-bulk">
              <span className="pa-bulk-count">{selected.length} selected</span>
              {tab !== 'approved' && (
                <button type="button" onClick={() => bulk('approve')} disabled={busy === 'bulk'} className="pa-btn-black" style={{ height: 30, fontSize: 11 }}>
                  <Check size={11} strokeWidth={2.4} /> Approve
                </button>
              )}
              {tab !== 'rejected' && (
                <button type="button" onClick={() => bulk('reject')} disabled={busy === 'bulk'} className="pa-btn-sm"><X size={11} strokeWidth={2.2} /> Reject</button>
              )}
              <button type="button" onClick={() => bulk('feature')} disabled={busy === 'bulk'} className="pa-btn-sm">Feature</button>
              <button type="button" onClick={() => bulk('pin')} disabled={busy === 'bulk'} className="pa-btn-sm">Pin</button>
              <button type="button" onClick={() => bulk('verify')} disabled={busy === 'bulk'} className="pa-btn-sm">Mark verified</button>
              <button type="button" onClick={() => bulk('delete')} disabled={busy === 'bulk'} className="pa-btn-sm" style={{ color: 'var(--pa-red-text)' }}>
                <Trash2 size={11} strokeWidth={2.2} /> Delete
              </button>
              <button type="button" onClick={() => setSelected([])} className="pa-text-link pa-clear">Clear</button>
            </div>
          )}

          {/* ── States ────────────────────────────────────────────────── */}
          {err && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><AlertTriangle size={18} strokeWidth={1.8} /></div>
              <h3>Unable to load reviews</h3>
              <p>{err}</p>
              <button type="button" onClick={() => { setLoaded(false); load(); }} className="pa-btn-black">Try again</button>
            </div>
          )}

          {!loaded && !err && (
            <div className="pa-card pa-skeleton">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="pa-sk-row" style={{ height: 64 }} />)}
            </div>
          )}

          {!err && loaded && filtered.length === 0 && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><Star size={18} strokeWidth={1.8} /></div>
              <h3>{q ? 'No reviews match' : 'Nothing here yet'}</h3>
              <p>{q ? 'No reviews match this search in the current tab.' : emptyCopy[tab]}</p>
              {q && <button type="button" onClick={() => setQ('')} className="pa-btn-sm">Clear search</button>}
            </div>
          )}

          {/* ── Review cards ──────────────────────────────────────────── */}
          {!err && filtered.length > 0 && (
            <div className="pa-rev-list">
              <label className="pa-filter-note" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: '0 2px' }}>
                <input type="checkbox" className="pa-input-chk" checked={allChecked} onChange={toggleAll} aria-label="Select all reviews in this tab" />
                Select all ({filtered.length})
              </label>

              {filtered.map((r, i) => {
                const isSel = selected.includes(r._id);
                return (
                  <div key={r._id} className={`pa-rev-card ${isSel ? 'selected' : ''}`} style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
                    <div className="pa-rev-top">
                      <input type="checkbox" className="pa-input-chk" checked={isSel} onChange={() => toggleOne(r._id)} aria-label={`Select review by ${r.customerName}`} />
                      <Stars n={r.rating} />
                      <span className="pa-rev-name">{r.customerName}</span>
                      {r.verified && <Badge tone="pa-b-green">Verified</Badge>}
                      {r.featured && <Badge tone="pa-b-purple">Featured</Badge>}
                      {r.pinned && <Badge tone="pa-b-yellow">Pinned</Badge>}
                      {r.reports > 0 && <Badge tone="pa-b-red">{r.reports} report{r.reports === 1 ? '' : 's'}</Badge>}
                      <span className="pa-rev-date" style={{ marginLeft: 'auto' }}>{new Date(r.createdAt).toLocaleDateString('en-PK')}</span>
                    </div>

                    {r.title && <p className="pa-rev-title">{r.title}</p>}
                    <p className="pa-rev-body">{r.body}</p>

                    {r.images?.length > 0 && (
                      <div className="pa-thumbs">
                        {r.images.slice(0, 5).map((img, j) => <img key={j} src={img.url} alt={`${r.customerName}'s photo ${j + 1}`} />)}
                      </div>
                    )}
                    {r.helpful > 0 && <p className="pa-helpful">{r.helpful} customer{r.helpful === 1 ? '' : 's'} found this helpful</p>}

                    {r.adminReply && (
                      <div className="pa-reply-block">
                        <p className="pa-reply-label">Your reply</p>
                        <p>{r.adminReply}</p>
                      </div>
                    )}

                    <div className="pa-rev-foot">
                      <div>
                        {r.product && (
                          <Link to={`/product/${r.product.slug}`} target="_blank" rel="noreferrer" className="pa-rev-product">
                            {r.product.name} <ExternalLink size={9} strokeWidth={2.4} />
                          </Link>
                        )}
                      </div>
                      <div className="pa-rev-actions">
                        {tab !== 'approved' && (
                          <button type="button" disabled={busy === r._id} onClick={() => setStatus(r._id, 'approved')} className="pa-btn-black" style={{ height: 30, fontSize: 11 }}>
                            <Check size={11} strokeWidth={2.4} /> Approve
                          </button>
                        )}
                        {tab !== 'rejected' && (
                          <button type="button" disabled={busy === r._id} onClick={() => setStatus(r._id, 'rejected')} className="pa-btn-sm"><X size={11} strokeWidth={2.2} /> Reject</button>
                        )}
                        <button type="button" disabled={busy === r._id} onClick={() => { setReplying(r._id); setReply(r.adminReply || ''); }} className="pa-btn-sm">
                          <MessageSquare size={11} strokeWidth={2.2} /> Reply
                        </button>
                        <button type="button" disabled={busy === r._id} onClick={() => del(r._id)} className="pa-action-btn danger" aria-label="Delete review" title="Delete permanently">
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {replying === r._id && (
                      <div className="pa-reply-edit">
                        <p className="pa-field-label">Public reply from HUSHAE</p>
                        <textarea rows={3} className="pa-textarea" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thanks for the feedback…" autoFocus />
                        <div className="pa-reply-edit-actions">
                          <button type="button" onClick={() => setReplying(null)} className="pa-btn-sm">Cancel</button>
                          <button type="button" onClick={saveReply} disabled={busy === r._id} className="pa-btn-black">
                            {busy === r._id ? 'Saving…' : 'Save reply'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Pagination (reference bar) ────────────────────────────── */}
          {!err && loaded && total > 0 && (
            <div className="pa-card pa-pager">
              <p className="pa-pager-text">
                Showing {Math.min((page - 1) * per + 1, total).toLocaleString()} to {Math.min(page * per, total).toLocaleString()} of {total.toLocaleString()} results
              </p>
              <div className="pa-pager-btns">
                <button type="button" className="pa-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">‹</button>
                {pageList(page, pageCount).map((p, i) => (
                  p === '…'
                    ? <span key={`e${i}`} className="pa-ellipsis" aria-hidden>…</span>
                    : <button key={p} type="button" className={`pa-page-btn ${p === page ? 'on' : ''}`} onClick={() => setPage(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>
                ))}
                <button type="button" className="pa-page-btn" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} aria-label="Next page">›</button>
                <select
                  value={per}
                  onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }}
                  aria-label="Results per page"
                  className="pa-select pa-per-select"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}
