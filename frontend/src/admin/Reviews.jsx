import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Check, X, MessageSquare, Trash2, ExternalLink } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';

/**
 * Admin — Reviews moderation.
 * Tabs: Pending / Approved / Rejected + counts.
 * Each row: rating, customer, review, product link, approve / reject / reply / delete.
 */
export default function Reviews() {
  const { auth, toast } = useApp();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [busy, setBusy] = useState(null);
  const [replying, setReplying] = useState(null);
  const [reply, setReply] = useState('');

  const load = () => {
    api(`/reviews/admin?status=${tab}`, { token: auth?.token })
      .then((d) => { setRows(d.reviews || []); setCounts(d.counts || {}); })
      .catch(() => setRows([]));
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
    { id: 'pending',  label: 'Pending review' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t.id ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:text-neutral-900'
            }`}
          >
            {t.label} <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[11px]">{counts[t.id] || 0}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="font-sans text-xl text-neutral-900">Nothing here yet</p>
          <p className="mt-2 text-sm text-neutral-500">
            {tab === 'pending' ? 'When a customer writes a review it will land here for your approval.' :
             tab === 'approved' ? 'Approved reviews appear on the product page publicly.' :
             'Rejected reviews stay in the DB but never show publicly.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(r => (
            <div key={r._id} className="card p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={14} className={n <= r.rating ? 'fill-amber-500 text-amber-500' : 'text-neutral-200'} />
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">{r.customerName}</p>
                    {r.verified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Verified</span>}
                    <p className="text-xs text-neutral-500">{new Date(r.createdAt).toLocaleDateString('en-PK')}</p>
                  </div>
                  {r.title && <p className="mt-2 font-semibold text-neutral-900">{r.title}</p>}
                  <p className="mt-1 text-sm text-neutral-700">{r.body}</p>
                  {r.adminReply && (
                    <div className="mt-3 rounded-lg bg-emerald-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Your reply</p>
                      <p className="mt-1 text-sm text-neutral-800">{r.adminReply}</p>
                    </div>
                  )}
                  {r.product && (
                    <Link to={`/product/${r.product.slug}`} target="_blank" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900">
                      {r.product.name} <ExternalLink size={11} />
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  {tab !== 'approved' && (
                    <button disabled={busy === r._id} onClick={() => setStatus(r._id, 'approved')}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                      <Check size={13} /> Approve
                    </button>
                  )}
                  {tab !== 'rejected' && (
                    <button disabled={busy === r._id} onClick={() => setStatus(r._id, 'rejected')}
                      className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black disabled:opacity-50">
                      <X size={13} /> Reject
                    </button>
                  )}
                  <button disabled={busy === r._id} onClick={() => { setReplying(r._id); setReply(r.adminReply || ''); }}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200 hover:text-neutral-900">
                    <MessageSquare size={13} /> Reply
                  </button>
                  <button disabled={busy === r._id} onClick={() => del(r._id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {replying === r._id && (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <label className="label">Public reply from HUSHAE</label>
                  <textarea rows={3} className="input" value={reply} onChange={(e) => setReply(e.target.value)}
                    placeholder="Thanks for the feedback — we're glad the fit worked out…" />
                  <div className="mt-2 flex justify-end gap-2">
                    <button onClick={() => setReplying(null)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-neutral-200">Cancel</button>
                    <button onClick={saveReply} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white">Save reply</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
