import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Check, X, MessageSquare, Trash2, Pin, Award, Shield, ChevronRight, Search, Filter, Loader2, XIcon } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * REVIEWS — Video Pages Rebuild: Moderation Workspace
 * Queue tabs + filters + review rows + drawer detail + moderation actions
 * ========================================================================== */

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12} className={i <= rating ? 'text-[#111] fill-[#111]' : 'text-[#D1D5DB]'} />
      ))}
    </div>
  );
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
  const [search, setSearch] = useState('');
  const [drawerReview, setDrawerReview] = useState(null);

  const load = () => {
    api(`/reviews/admin?status=${tab}`, { token: auth?.token })
      .then((d) => { setRows(d.reviews || []); setCounts(d.counts || {}); setSelected([]); })
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  };

  const toggleOne = (id) => setSelected((s2) => (s2.includes(id) ? s2.filter((x) => x !== id) : [...s2, id]));
  const allChecked = rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => setSelected(allChecked ? [] : rows.map((r) => r._id));

  const bulk = async (action) => {
    if (!selected.length) return;
    if (action === 'delete' && !confirm(`Delete ${selected.length} review(s) permanently?`)) return;
    setBusy('bulk');
    try {
      const r = await api('/reviews/admin/bulk', { method: 'POST', body: { ids: selected, action }, token: auth.token });
      toast(`${r.affected} review${r.affected === 1 ? '' : 's'} updated`);
      load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(null); }
  };

  useEffect(() => { if (auth?.token) load(); }, [tab, auth?.token]); // eslint-disable-line

  const setStatus = async (id, status) => {
    setBusy(id);
    try {
      await api(`/reviews/admin/${id}`, { method: 'PATCH', body: { status }, token: auth.token });
      toast(status === 'approved' ? 'Review approved' : 'Review rejected');
      load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(null); }
  };

  const del = async (id) => {
    if (!confirm('Delete this review permanently?')) return;
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

  // Client-side search filter
  const filtered = search.trim()
    ? rows.filter(r => r.customerName?.toLowerCase().includes(search.toLowerCase()) || r.body?.toLowerCase().includes(search.toLowerCase()) || r.product?.name?.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <AdminLayout title="Reviews">
      {/* Header */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb"><Link to="/admin">Home</Link><span>/</span><span>Reviews</span></div>
          <h1 className="v3-h-page">Reviews</h1>
          <p className="v3-h-small mt-1">Moderate customer reviews before they appear on product pages.</p>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="v3-tabs">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`v3-tab ${tab === t.id ? 'active' : ''}`}>
            {t.label}
            {(counts[t.id] || 0) > 0 && <span className="ml-1.5 text-[10px] font-semibold tabular">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="v3-filter-bar">
        <div className="relative flex-1" style={{ maxWidth: 280 }}>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews…" className="v3-input" style={{ paddingLeft: 30, height: 30, fontSize: 12 }} />
        </div>
        <div className="v3-toolbar-spacer" />
        {selected.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#6B7280] mr-2">{selected.length} selected</span>
            {tab !== 'approved' && <button onClick={() => bulk('approve')} disabled={busy === 'bulk'} className="v3-btn v3-btn-primary v3-btn-sm"><Check size={12} /> Approve</button>}
            {tab !== 'rejected' && <button onClick={() => bulk('reject')} disabled={busy === 'bulk'} className="v3-btn v3-btn-secondary v3-btn-sm"><X size={12} /> Reject</button>}
            <button onClick={() => bulk('feature')} disabled={busy === 'bulk'} className="v3-btn v3-btn-ghost v3-btn-sm"><Award size={12} /> Feature</button>
            <button onClick={() => bulk('pin')} disabled={busy === 'bulk'} className="v3-btn v3-btn-ghost v3-btn-sm"><Pin size={12} /> Pin</button>
            <button onClick={() => bulk('delete')} disabled={busy === 'bulk'} className="v3-btn v3-btn-ghost v3-btn-sm"><Trash2 size={12} /></button>
            <button onClick={() => setSelected([])} className="v3-btn v3-btn-ghost v3-btn-sm">Clear</button>
          </div>
        )}
      </div>

      {/* Content */}
      {!loaded ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 v3-skeleton rounded-[5px]" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="v3-card">
          <div className="v3-empty">
            <Star size={24} className="v3-empty-icon" />
            <p className="v3-empty-title">
              {search ? 'No reviews match your search' : tab === 'pending' ? 'No pending reviews' : tab === 'approved' ? 'No approved reviews yet' : 'No rejected reviews'}
            </p>
            <p className="v3-empty-desc">
              {tab === 'pending' ? 'When a customer writes a review it will land here for your approval.' : tab === 'approved' ? 'Approved reviews appear on the product page publicly.' : 'Rejected reviews stay in the database but never show publicly.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="v3-card">
          {/* Select all */}
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[#E5E7EB] bg-[#FAFBFC]">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-3.5 h-3.5 accent-[#111]" />
            <span className="text-[11px] text-[#6B7280]">Select all ({filtered.length})</span>
          </div>

          {/* Review rows */}
          <div className="divide-y divide-[#F0F1F3]">
            {filtered.map(r => (
              <div key={r._id} className={`px-5 py-4 transition-colors ${selected.includes(r._id) ? 'bg-[#F5F6F8]' : 'hover:bg-[#FAFBFC]'}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggleOne(r._id)} className="mt-1 w-3.5 h-3.5 accent-[#111] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {/* Top row: rating + customer + badges + date */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <StarRating rating={r.rating} />
                      <span className="text-[13px] font-medium text-[#111]">{r.customerName}</span>
                      {r.verified && <span className="v3-status v3-status-active" style={{ padding: '1px 6px', fontSize: 9 }}><Shield size={8} /> Verified</span>}
                      {r.featured && <span className="v3-status v3-status-strong" style={{ padding: '1px 6px', fontSize: 9 }}><Award size={8} /> Featured</span>}
                      {r.pinned && <span className="v3-status v3-status-active" style={{ padding: '1px 6px', fontSize: 9 }}><Pin size={8} /> Pinned</span>}
                      {r.reports > 0 && <span className="v3-status v3-status-pending" style={{ padding: '1px 6px', fontSize: 9 }}>{r.reports} report{r.reports > 1 ? 's' : ''}</span>}
                      <span className="text-[11px] text-[#9CA3AF] ml-auto">{new Date(r.createdAt).toLocaleDateString('en-PK')}</span>
                    </div>

                    {/* Title + body */}
                    {r.title && <p className="mt-1.5 text-[13px] font-medium text-[#111]">{r.title}</p>}
                    <p className="mt-1 text-[12px] leading-relaxed text-[#4A4A4A] line-clamp-2">{r.body}</p>

                    {/* Product link */}
                    {r.product && (
                      <Link to={`/product/${r.product.slug}`} target="_blank" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#111]" style={{ textDecoration: 'none' }}>
                        {r.product.name} <ChevronRight size={10} />
                      </Link>
                    )}

                    {/* Admin reply */}
                    {r.adminReply && (
                      <div className="mt-2 border-l-2 border-[#E5E7EB] pl-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">Your reply</p>
                        <p className="mt-0.5 text-[12px] text-[#4A4A4A]">{r.adminReply}</p>
                      </div>
                    )}

                    {/* Inline reply */}
                    {replying === r._id && (
                      <div className="mt-3 border-t border-[#E5E7EB] pt-3">
                        <label className="v3-label">Public reply from HUSHAE</label>
                        <textarea rows={3} className="v3-textarea" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thanks for the feedback…" />
                        <div className="mt-2 flex justify-end gap-2">
                          <button onClick={() => setReplying(null)} className="v3-btn v3-btn-ghost v3-btn-sm">Cancel</button>
                          <button onClick={saveReply} disabled={busy === r._id} className="v3-btn v3-btn-primary v3-btn-sm">
                            {busy === r._id ? <Loader2 size={11} className="animate-spin" /> : <MessageSquare size={11} />} Save Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setDrawerReview(r); }} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="View details">
                      <ChevronRight size={13} />
                    </button>
                    {tab !== 'approved' && <button onClick={() => setStatus(r._id, 'approved')} disabled={busy === r._id} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Approve"><Check size={13} /></button>}
                    {tab !== 'rejected' && <button onClick={() => setStatus(r._id, 'rejected')} disabled={busy === r._id} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Reject"><X size={13} /></button>}
                    <button onClick={() => { setReplying(replying === r._id ? null : r._id); setReply(r.adminReply || ''); }} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Reply"><MessageSquare size={13} /></button>
                    <button onClick={() => del(r._id)} disabled={busy === r._id} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Detail Drawer */}
      {drawerReview && (
        <>
          <div className="v3-drawer-overlay" onClick={() => setDrawerReview(null)} />
          <div className="v3-drawer">
            <div className="v3-drawer-header">
              <span className="v3-h-section">Review Detail</span>
              <button onClick={() => setDrawerReview(null)} className="v3-btn v3-btn-icon v3-btn-ghost"><XIcon size={16} /></button>
            </div>
            <div className="v3-drawer-body space-y-5">
              <div>
                <StarRating rating={drawerReview.rating} />
                <p className="mt-2 text-[14px] font-medium text-[#111]">{drawerReview.customerName}</p>
                <p className="text-[12px] text-[#9CA3AF]">{new Date(drawerReview.createdAt).toLocaleString()}</p>
              </div>

              {drawerReview.title && <p className="text-[14px] font-semibold text-[#111]">{drawerReview.title}</p>}
              <p className="text-[13px] leading-relaxed text-[#4A4A4A]">{drawerReview.body}</p>

              {drawerReview.product && (
                <div className="border-t border-[#E5E7EB] pt-4">
                  <div className="v3-h-label mb-1">Product</div>
                  <Link to={`/product/${drawerReview.product.slug}`} target="_blank" className="text-[13px] text-[#111] hover:underline">{drawerReview.product.name}</Link>
                </div>
              )}

              <div className="border-t border-[#E5E7EB] pt-4 space-y-2">
                <div className="v3-h-label">Status</div>
                <div className="flex gap-2">
                  {drawerReview.verified && <span className="v3-status v3-status-active">Verified</span>}
                  {drawerReview.featured && <span className="v3-status v3-status-strong">Featured</span>}
                  {drawerReview.pinned && <span className="v3-status v3-status-active">Pinned</span>}
                </div>
              </div>

              {drawerReview.adminReply && (
                <div className="border-t border-[#E5E7EB] pt-4">
                  <div className="v3-h-label mb-1">Admin Reply</div>
                  <p className="text-[13px] text-[#4A4A4A]">{drawerReview.adminReply}</p>
                </div>
              )}

              <div className="border-t border-[#E5E7EB] pt-4 flex gap-2">
                {tab !== 'approved' && <button onClick={() => { setStatus(drawerReview._id, 'approved'); setDrawerReview(null); }} className="v3-btn v3-btn-primary v3-btn-sm"><Check size={12} /> Approve</button>}
                {tab !== 'rejected' && <button onClick={() => { setStatus(drawerReview._id, 'rejected'); setDrawerReview(null); }} className="v3-btn v3-btn-secondary v3-btn-sm"><X size={12} /> Reject</button>}
                <button onClick={() => { setReplying(drawerReview._id); setReply(drawerReview.adminReply || ''); setDrawerReview(null); }} className="v3-btn v3-btn-ghost v3-btn-sm"><MessageSquare size={12} /> Reply</button>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
