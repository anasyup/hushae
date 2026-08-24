import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, EditorialEmpty, MonoStatus, TableSkeleton } from './orders/orderUi';
import { ta } from './settings/chrome';

export default function Questions() {
  const { auth, toast } = useApp();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, unanswered: 0 });
  const [busy, setBusy] = useState(null);
  const [replying, setReplying] = useState(null);
  const [reply, setReply] = useState('');
  const [selected, setSelected] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    api(`/questions/admin?status=${tab}`, { token: auth?.token })
      .then((d) => { setRows(d.questions || []); setCounts(d.counts || {}); setSelected([]); })
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  };
  useEffect(() => { if (auth?.token) load(); /* eslint-disable-next-line */ }, [tab, auth?.token]);

  const setStatus = async (id, status) => {
    setBusy(id);
    try {
      await api(`/questions/admin/${id}`, { method: 'PATCH', body: { status }, token: auth.token });
      toast(status === 'approved' ? 'Question approved' : 'Question rejected');
      load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(null); }
  };

  const del = async (id) => {
    if (!confirm('Delete this question permanently?')) return;
    setBusy(id);
    try { await api(`/questions/admin/${id}`, { method: 'DELETE', token: auth.token }); toast('Deleted'); load(); }
    catch (e) { toast(e.message || 'Failed'); } finally { setBusy(null); }
  };

  const sendReply = async (id) => {
    if (!reply.trim()) return;
    setBusy(id);
    try {
      await api(`/questions/admin/${id}`, { method: 'PATCH', body: { reply: reply.trim() }, token: auth.token });
      toast('Answer posted');
      setReplying(null); setReply(''); load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(null); }
  };

  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allChecked = rows.length > 0 && selected.length === rows.length;

  const bulk = async (action) => {
    if (!selected.length) return;
    if (action === 'delete' && !confirm(`Delete ${selected.length} question(s)?`)) return;
    setBusy('bulk');
    try {
      const r = await api('/questions/admin/bulk', { method: 'POST', body: { ids: selected, action }, token: auth.token });
      toast(`${r.affected} question${r.affected === 1 ? '' : 's'} updated`);
      load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(null); }
  };

  const TABS = [['pending', 'Awaiting you'], ['approved', 'Live'], ['rejected', 'Rejected']];

  return (
    <AdminLayout title="Questions">
      <PageHeader
        title="Questions"
        description={counts.unanswered > 0
          ? `${counts.unanswered} live question${counts.unanswered === 1 ? '' : 's'} still waiting for an answer.`
          : 'Every live question has an answer.'}
      />

      <div className="mb-8 flex flex-wrap gap-1.5">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={tab === id ? btnSolid : btnGhost}>
            {label} {counts[id] ? counts[id] : ''}
          </button>
        ))}
      </div>

      {!loaded ? (
        <TableSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EditorialEmpty
          title="Nothing here yet"
          description={tab === 'pending' ? 'New customer questions land here for your approval.' : tab === 'approved' ? 'Approved questions appear on the product page.' : 'Rejected questions stay in the database but never show publicly.'}
        />
      ) : (
        <section>
          <p className="adm-index">01 — {tab}</p>
          <div className="mb-4 flex flex-wrap items-center gap-2 border-y border-[#EAEAEA] py-3">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#555555]">
              <input type="checkbox" checked={allChecked} onChange={() => setSelected(allChecked ? [] : rows.map((r) => r._id))} className="h-4 w-4 accent-white" />
              Select all ({rows.length})
            </label>
            {selected.length > 0 && (
              <div className="ml-auto flex flex-wrap gap-1.5">
                {tab !== 'approved' && <button type="button" onClick={() => bulk('approve')} disabled={busy === 'bulk'} className={btnSolid}>Approve</button>}
                {tab !== 'rejected' && <button type="button" onClick={() => bulk('reject')} disabled={busy === 'bulk'} className={btnGhost}>Reject</button>}
                <button type="button" onClick={() => bulk('feature')} disabled={busy === 'bulk'} className={btnGhost}>Feature</button>
                <button type="button" onClick={() => bulk('delete')} disabled={busy === 'bulk'} className={btnGhost}>Delete</button>
              </div>
            )}
          </div>

          <div className="border-y border-[#EAEAEA]">
            {rows.map((q) => (
              <div key={q._id} className="border-b border-[#F0F0F0] py-5 last:border-0">
                <div className="flex gap-3">
                  <input type="checkbox" checked={selected.includes(q._id)} onChange={() => toggleOne(q._id)} aria-label={`Select question from ${q.customerName}`} className="mt-1 h-4 w-4 shrink-0 accent-white" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] text-black">{q.customerName}</p>
                      <p className="text-[11px] text-[#AAAAAA]">{new Date(q.createdAt).toLocaleDateString('en-PK')}</p>
                      {q.featured && <MonoStatus label="FEATURED" />}
                      {q.reports > 0 && <MonoStatus label={`${q.reports} REPORT${q.reports === 1 ? '' : 'S'}`} dim />}
                      {(q.answers || []).length === 0 && <MonoStatus label="UNANSWERED" dim />}
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#333333]">{q.body}</p>
                    {(q.answers || []).length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {q.answers.map((a) => (
                          <li key={a._id} className="border-l border-[#EAEAEA] pl-3">
                            <p className="adm-label">
                              {a.isMerchant ? 'Your answer' : a.authorName}
                              {a.status !== 'approved' && <span className="ml-2 text-[#999999]">· {a.status}</span>}
                            </p>
                            <p className="mt-1 text-[13px] text-[#555555]">{a.body}</p>
                            {!a.isMerchant && a.status === 'pending' && (
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api(`/questions/admin/${q._id}`, { method: 'PATCH', body: { answerId: a._id, answerStatus: 'approved' }, token: auth.token });
                                    load();
                                  }}
                                  className={btnSolid}
                                >
                                  Approve answer
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api(`/questions/admin/${q._id}`, { method: 'PATCH', body: { answerId: a._id, answerStatus: 'rejected' }, token: auth.token });
                                    load();
                                  }}
                                  className={btnGhost}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.product && (
                      <Link to={`/product/${q.product.slug}`} target="_blank" className="mt-3 inline-block text-[12px] text-[#999999] hover:text-black">{q.product.name}</Link>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-start gap-2">
                    {tab !== 'approved' && <button type="button" disabled={busy === q._id} onClick={() => setStatus(q._id, 'approved')} className={btnSolid}>Approve</button>}
                    {tab !== 'rejected' && <button type="button" disabled={busy === q._id} onClick={() => setStatus(q._id, 'rejected')} className={btnGhost}>Reject</button>}
                    <button type="button" onClick={() => { setReplying(replying === q._id ? null : q._id); setReply(''); }} className={btnGhost}>Answer</button>
                    <button type="button" disabled={busy === q._id} onClick={() => del(q._id)} className={btnGhost}>Delete</button>
                  </div>
                </div>
                {replying === q._id && (
                  <div className="mt-4 border-t border-[#EAEAEA] pt-4">
                    <label className="adm-label mb-1.5 block" htmlFor={`reply-${q._id}`}>Public answer from HUSHAE</label>
                    <textarea id={`reply-${q._id}`} rows={3} className={ta} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="It runs true to size…" />
                    <p className="mt-1 text-[12px] text-[#AAAAAA]">Posting an answer also approves the question.</p>
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setReplying(null)} className={btnGhost}>Cancel</button>
                      <button type="button" onClick={() => sendReply(q._id)} disabled={busy === q._id} className={btnSolid}>Post answer</button>
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
