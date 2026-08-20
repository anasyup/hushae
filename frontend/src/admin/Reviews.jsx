import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Check, X, MessageSquare, Trash2, ExternalLink, Pin, Sparkles } from 'lucide-react';
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
  const [selected, setSelected] = useState([]);

  const load = () => {
    api(`/reviews/admin?status=${tab}`, { token: auth?.token })
      .then((d) => { setRows(d.reviews || []); setCounts(d.counts || {}); setSelected([]); })
      .catch(() => setRows([]));
  };

  /* Bulk actions. The tick boxes are cleared on every reload so a stale
     selection can never be applied to a list that has moved on. */
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

  const flag = async (id, field, value) => {
    setBusy(id);
    try {
      await api('/reviews/admin/bulk', { method: 'POST', body: { ids: [id], action: value ? field : `un${field}` }, token: auth.token });
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
            {t.label} <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[12px]">{counts[t.id] || 0}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-16 text-center">
          <p className="font-sans text-xl text-neutral-900">Nothing here yet</p>
          <p className="mt-2 text-sm text-neutral-500">
            {tab === 'pending' ? 'When a customer writes a review it will land here for your approval.' :
             tab === 'approved' ? 'Approved reviews appear on the product page publicly.' :
             'Rejected reviews stay in the DB but never show publicly.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bulk bar. Appears only with a selection so it never competes
              with the list for attention. */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-neutral-700">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 accent-neutral-900" />
              Select all ({rows.length})
            </label>
            {selected.length > 0 && (
              <>
                <span className="text-[12px] text-neutral-500">· {selected.length} selected</span>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {tab !== 'approved' && <button onClick={() => bulk('approve')} disabled={busy==='bulk'} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50">Approve</button>}
                  {tab !== 'rejected' && <button onClick={() => bulk('reject')} disabled={busy==='bulk'} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-[13px] font-semibold text-neutral-700 disabled:opacity-50">Reject</button>}
                  <button onClick={() => bulk('feature')} disabled={busy==='bulk'} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-[13px] font-semibold text-neutral-700 disabled:opacity-50">Feature</button>
                  <button onClick={() => bulk('pin')} disabled={busy==='bulk'} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-[13px] font-semibold text-neutral-700 disabled:opacity-50">Pin</button>
                  <button onClick={() => bulk('verify')} disabled={busy==='bulk'} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-[13px] font-semibold text-neutral-700 disabled:opacity-50">Mark verified</button>
                  <button onClick={() => bulk('delete')} disabled={busy==='bulk'} className="rounded-lg border border-[#E0C6BE] px-3 py-1.5 text-[13px] font-semibold text-[#9A5548] disabled:opacity-50">Delete</button>
                </div>
              </>
            )}
          </div>

          {rows.map(r => (
            <div key={r._id} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div className="flex flex-1 gap-3">
                  <input
                    type="checkbox" checked={selected.includes(r._id)} onChange={() => toggleOne(r._id)}
                    aria-label={`Select review by ${r.customerName}`}
                    className="mt-1 h-4 w-4 shrink-0 accent-neutral-900"
                  />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={14} className={n <= r.rating ? 'fill-amber-500 text-[#A68A56]' : 'text-neutral-200'} />
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">{r.customerName}</p>
                    {r.verified && <span className="rounded-full bg-[#E9EFEA] px-2 py-0.5 text-[13px] font-semibold text-[#3E5C4B]">Verified</span>}
                    <p className="text-xs text-neutral-500">{new Date(r.createdAt).toLocaleDateString('en-PK')}</p>
                    {r.featured && <span className="rounded-full bg-[#F6F1E6] px-2 py-0.5 text-[13px] font-semibold text-[#7A6239]">Featured</span>}
                    {r.pinned && <span className="rounded-full bg-[#F1F1F1] px-2 py-0.5 text-[13px] font-semibold text-[#5A5A5A]">Pinned</span>}
                    {r.reports > 0 && <span className="rounded-full bg-[#F5EDEB] px-2 py-0.5 text-[13px] font-semibold text-[#8A4B3F]">{r.reports} report{r.reports===1?'':'s'}</span>}
                  </div>
                  {r.title && <p className="mt-2 font-semibold text-neutral-900">{r.title}</p>}
                  <p className="mt-1 text-sm text-neutral-700">{r.body}</p>
                  {r.adminReply && (
                    <div className="mt-3 rounded-lg bg-[#E9EFEA] p-3">
                      <p className="text-[13px] font-bold uppercase tracking-wider text-[#3E5C4B]">Your reply</p>
                      <p className="mt-1 text-sm text-neutral-800">{r.adminReply}</p>
                    </div>
                  )}
                  {r.product && (
                    <Link to={`/product/${r.product.slug}`} target="_blank" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900">
                      {r.product.name} <ExternalLink size={11} />
                    </Link>
                  )}
                </div>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  {tab !== 'approved' && (
                    <button disabled={busy === r._id} onClick={() => setStatus(r._id, 'approved')}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#4A6B58] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3E5C4B] disabled:opacity-50">
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
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#9A5548] ring-1 ring-[#E0C6BE] hover:bg-[#F5EDEB]">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {replying === r._id && (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Public reply from HUSHAE</label>
                  <textarea rows={3} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={reply} onChange={(e) => setReply(e.target.value)}
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
