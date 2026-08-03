import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, MessageCircleQuestion, Send, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * ADMIN — Questions & Answers
 *
 * Mirrors the review desk: tabs by status, bulk actions, and an inline reply
 * that posts as the store. Replying also approves the question — the merchant
 * is the moderator, so making them approve their own answer would be a step
 * that exists only to be clicked.
 * ========================================================================== */
export default function Questions() {
  const { auth, toast } = useApp();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, unanswered: 0 });
  const [busy, setBusy] = useState(null);
  const [replying, setReplying] = useState(null);
  const [reply, setReply] = useState('');
  const [selected, setSelected] = useState([]);

  const load = () => {
    api(`/questions/admin?status=${tab}`, { token: auth?.token })
      .then((d) => { setRows(d.questions || []); setCounts(d.counts || {}); setSelected([]); })
      .catch(() => setRows([]));
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
      <div className="mb-5 flex items-start gap-4 border-b border-neutral-200 pb-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
          <MessageCircleQuestion size={19} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="font-sans text-xl text-neutral-900">Questions &amp; Answers</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            {counts.unanswered > 0
              ? `${counts.unanswered} live question${counts.unanswered === 1 ? '' : 's'} still waiting for an answer.`
              : 'Every live question has an answer.'}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button
            key={id} onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition ${
              tab === id ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:text-neutral-900'
            }`}
          >
            {label} {counts[id] ? `(${counts[id]})` : ''}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-16 text-center">
          <p className="font-sans text-xl text-neutral-900">Nothing here yet</p>
          <p className="mt-2 text-sm text-neutral-500">
            {tab === 'pending' ? 'New customer questions land here for your approval.'
              : tab === 'approved' ? 'Approved questions appear on the product page.'
              : 'Rejected questions stay in the database but never show publicly.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-neutral-700">
              <input
                type="checkbox" checked={allChecked}
                onChange={() => setSelected(allChecked ? [] : rows.map((r) => r._id))}
                className="h-4 w-4 accent-neutral-900"
              />
              Select all ({rows.length})
            </label>
            {selected.length > 0 && (
              <>
                <span className="text-[12px] text-neutral-500">· {selected.length} selected</span>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {tab !== 'approved' && <button onClick={() => bulk('approve')} disabled={busy === 'bulk'} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50">Approve</button>}
                  {tab !== 'rejected' && <button onClick={() => bulk('reject')} disabled={busy === 'bulk'} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-[11.5px] font-semibold text-neutral-700 disabled:opacity-50">Reject</button>}
                  <button onClick={() => bulk('feature')} disabled={busy === 'bulk'} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-[11.5px] font-semibold text-neutral-700 disabled:opacity-50">Feature</button>
                  <button onClick={() => bulk('delete')} disabled={busy === 'bulk'} className="rounded-lg border border-red-200 px-3 py-1.5 text-[11.5px] font-semibold text-red-600 disabled:opacity-50">Delete</button>
                </div>
              </>
            )}
          </div>

          {rows.map((q) => (
            <div key={q._id} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex gap-3">
                <input
                  type="checkbox" checked={selected.includes(q._id)} onChange={() => toggleOne(q._id)}
                  aria-label={`Select question from ${q.customerName}`}
                  className="mt-1 h-4 w-4 shrink-0 accent-neutral-900"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-900">{q.customerName}</p>
                    <p className="text-xs text-neutral-500">{new Date(q.createdAt).toLocaleDateString('en-PK')}</p>
                    {q.featured && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Featured</span>}
                    {q.reports > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">{q.reports} report{q.reports === 1 ? '' : 's'}</span>}
                    {(q.answers || []).length === 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Unanswered</span>}
                  </div>

                  <p className="mt-2 text-[12px] text-neutral-900">{q.body}</p>

                  {(q.answers || []).length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {q.answers.map((a) => (
                        <li key={a._id} className={`rounded-lg p-3 ${a.isMerchant ? 'bg-emerald-50' : 'bg-neutral-50'}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            {a.isMerchant ? 'Your answer' : a.authorName}
                            {a.status !== 'approved' && <span className="ml-2 text-amber-700">· {a.status}</span>}
                          </p>
                          <p className="mt-1 text-sm text-neutral-800">{a.body}</p>
                          {!a.isMerchant && a.status === 'pending' && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={async () => {
                                  await api(`/questions/admin/${q._id}`, { method: 'PATCH', body: { answerId: a._id, answerStatus: 'approved' }, token: auth.token });
                                  load();
                                }}
                                className="rounded-md bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-white"
                              >
                                Approve answer
                              </button>
                              <button
                                onClick={async () => {
                                  await api(`/questions/admin/${q._id}`, { method: 'PATCH', body: { answerId: a._id, answerStatus: 'rejected' }, token: auth.token });
                                  load();
                                }}
                                className="rounded-md border border-neutral-300 px-2.5 py-1 text-[11px] font-semibold text-neutral-700"
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
                    <Link to={`/product/${q.product.slug}`} target="_blank" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900">
                      {q.product.name} <ExternalLink size={11} />
                    </Link>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-start gap-2">
                  {tab !== 'approved' && (
                    <button
                      disabled={busy === q._id} onClick={() => setStatus(q._id, 'approved')}
                      className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <Check size={12} /> Approve
                    </button>
                  )}
                  {tab !== 'rejected' && (
                    <button
                      disabled={busy === q._id} onClick={() => setStatus(q._id, 'rejected')}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200 disabled:opacity-50"
                    >
                      <X size={12} /> Reject
                    </button>
                  )}
                  <button
                    onClick={() => { setReplying(replying === q._id ? null : q._id); setReply(''); }}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200"
                  >
                    <Send size={12} /> Answer
                  </button>
                  <button
                    disabled={busy === q._id} onClick={() => del(q._id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {replying === q._id && (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500" htmlFor={`reply-${q._id}`}>Public answer from HUSHAE</label>
                  <textarea
                    id={`reply-${q._id}`} rows={3} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="It runs true to size — we'd suggest your usual…"
                  />
                  <p className="mt-1 text-[11px] text-neutral-500">Posting an answer also approves the question.</p>
                  <div className="mt-2 flex justify-end gap-2">
                    <button onClick={() => setReplying(null)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-neutral-200">Cancel</button>
                    <button onClick={() => sendReply(q._id)} disabled={busy === q._id} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Post answer</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
