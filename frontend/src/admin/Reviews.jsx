import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, EditorialEmpty, MonoStatus, TableSkeleton } from './orders/orderUi';
import { ta } from './settings/chrome';

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

  useEffect(() => { if (auth?.token) load(); /* eslint-disable-next-line */ }, [tab, auth?.token]);

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

  const tabs = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <AdminLayout title="Reviews">
      <PageHeader title="Reviews" description="Moderate customer reviews before they appear on product pages." />

      <div className="mb-8 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tab === t.id ? btnSolid : btnGhost}>
            {t.label} {counts[t.id] || 0}
          </button>
        ))}
      </div>

      {!loaded ? (
        <TableSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EditorialEmpty
          title="Nothing here yet"
          description={tab === 'pending' ? 'When a customer writes a review it will land here for your approval.' : tab === 'approved' ? 'Approved reviews appear on the product page publicly.' : 'Rejected reviews stay in the DB but never show publicly.'}
        />
      ) : (
        <section>
          <p className="adm-index">01 — {tab}</p>
          <div className="mb-4 flex flex-wrap items-center gap-2 border-y border-white/10 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-white/70">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 accent-white" />
              Select all ({rows.length})
            </label>
            {selected.length > 0 && (
              <div className="ml-auto flex flex-wrap gap-1.5">
                {tab !== 'approved' && <button type="button" onClick={() => bulk('approve')} disabled={busy === 'bulk'} className={btnSolid}>Approve</button>}
                {tab !== 'rejected' && <button type="button" onClick={() => bulk('reject')} disabled={busy === 'bulk'} className={btnGhost}>Reject</button>}
                <button type="button" onClick={() => bulk('feature')} disabled={busy === 'bulk'} className={btnGhost}>Feature</button>
                <button type="button" onClick={() => bulk('pin')} disabled={busy === 'bulk'} className={btnGhost}>Pin</button>
                <button type="button" onClick={() => bulk('verify')} disabled={busy === 'bulk'} className={btnGhost}>Mark verified</button>
                <button type="button" onClick={() => bulk('delete')} disabled={busy === 'bulk'} className={btnGhost}>Delete</button>
              </div>
            )}
          </div>

          <div className="border-y border-white/10">
            {rows.map((r) => (
              <div key={r._id} className="border-b border-white/5 py-5 last:border-0">
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggleOne(r._id)} aria-label={`Select review by ${r.customerName}`} className="mt-1 h-4 w-4 shrink-0 accent-white" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] tabular-nums text-white/50">{r.rating}/5</span>
                        <p className="text-[13px] text-white">{r.customerName}</p>
                        {r.verified && <MonoStatus label="VERIFIED" />}
                        {r.featured && <MonoStatus label="FEATURED" />}
                        {r.pinned && <MonoStatus label="PINNED" />}
                        {r.reports > 0 && <MonoStatus label={`${r.reports} REPORT${r.reports === 1 ? '' : 'S'}`} dim />}
                        <span className="text-[11px] text-white/30">{new Date(r.createdAt).toLocaleDateString('en-PK')}</span>
                      </div>
                      {r.title && <p className="mt-2 text-[13px] text-white">{r.title}</p>}
                      <p className="mt-1 text-[13px] leading-relaxed text-white/70">{r.body}</p>
                      {r.adminReply && (
                        <div className="mt-3 border-l border-white/20 pl-3">
                          <p className="adm-label">Your reply</p>
                          <p className="mt-1 text-[13px] text-white/70">{r.adminReply}</p>
                        </div>
                      )}
                      {r.product && (
                        <Link to={`/product/${r.product.slug}`} target="_blank" className="mt-3 inline-block text-[12px] text-white/40 hover:text-white">{r.product.name}</Link>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {tab !== 'approved' && <button type="button" disabled={busy === r._id} onClick={() => setStatus(r._id, 'approved')} className={btnSolid}>Approve</button>}
                    {tab !== 'rejected' && <button type="button" disabled={busy === r._id} onClick={() => setStatus(r._id, 'rejected')} className={btnGhost}>Reject</button>}
                    <button type="button" disabled={busy === r._id} onClick={() => { setReplying(r._id); setReply(r.adminReply || ''); }} className={btnGhost}>Reply</button>
                    <button type="button" disabled={busy === r._id} onClick={() => del(r._id)} className={btnGhost}>Delete</button>
                  </div>
                </div>
                {replying === r._id && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <label className="adm-label mb-1.5 block">Public reply from HUSHAE</label>
                    <textarea rows={3} className={ta} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thanks for the feedback…" />
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setReplying(null)} className={btnGhost}>Cancel</button>
                      <button type="button" onClick={saveReply} className={btnSolid}>Save reply</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </AdminLayout>
  );
}
