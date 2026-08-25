import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Trash2, MessageSquare, ChevronRight, Star } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * QUESTIONS V3 — Product Q&A Workbench
 * Unanswered/Answered tabs. Search/filter. Dense table with product, customer,
 * question, date, answer state. Answering uses inline expand. Status explicit.
 * All business logic preserved.
 * ========================================================================== */

const TABS = [
  { id: 'pending', label: 'Awaiting You' },
  { id: 'approved', label: 'Live' },
  { id: 'rejected', label: 'Rejected' },
];

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
  useEffect(() => { if (auth?.token) load(); }, [tab, auth?.token]); // eslint-disable-line

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

  return (
    <AdminLayout title="Questions">
      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link><span>/</span>
            <Link to="/admin/products">Products</Link><span>/</span>
            <span>Questions</span>
          </div>
          <h1 className="v3-h-page">Questions</h1>
          <p className="v3-h-small mt-1">
            {counts.unanswered > 0
              ? `${counts.unanswered} live question${counts.unanswered === 1 ? '' : 's'} still waiting for an answer.`
              : 'Every live question has an answer.'}
          </p>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────── */}
      <div className="v3-tabs">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`v3-tab ${tab === t.id ? 'active' : ''}`}>
            {t.label}
            {counts[t.id] > 0 && <span className="ml-1.5 text-[10px] font-semibold tabular">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────── */}
      {!loaded ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 v3-skeleton rounded-[5px]" />)}</div>
      ) : rows.length === 0 ? (
        <div className="v3-card">
          <div className="v3-empty">
            <MessageSquare size={24} className="v3-empty-icon" />
            <p className="v3-empty-title">Nothing here yet</p>
            <p className="v3-empty-desc">
              {tab === 'pending' ? 'New customer questions land here for your approval.' : tab === 'approved' ? 'Approved questions appear on the product page.' : 'Rejected questions stay in the database but never show publicly.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Bulk bar */}
          <div className="v3-filter-bar mb-4">
            <label className="flex items-center gap-2 text-[11px] text-[#6B7280] cursor-pointer">
              <input type="checkbox" checked={allChecked} onChange={() => setSelected(allChecked ? [] : rows.map(r => r._id))} className="w-3.5 h-3.5 accent-[#111]" />
              Select all ({rows.length})
            </label>
            <div className="v3-toolbar-spacer" />
            {selected.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#6B7280] mr-1">{selected.length} selected</span>
                {tab !== 'approved' && <button onClick={() => bulk('approve')} disabled={busy === 'bulk'} className="v3-btn v3-btn-primary v3-btn-sm"><Check size={12} /> Approve</button>}
                {tab !== 'rejected' && <button onClick={() => bulk('reject')} disabled={busy === 'bulk'} className="v3-btn v3-btn-secondary v3-btn-sm"><X size={12} /> Reject</button>}
                <button onClick={() => bulk('feature')} disabled={busy === 'bulk'} className="v3-btn v3-btn-ghost v3-btn-sm"><Star size={12} /> Feature</button>
                <button onClick={() => bulk('delete')} disabled={busy === 'bulk'} className="v3-btn v3-btn-ghost v3-btn-sm"><Trash2 size={12} /></button>
                <button onClick={() => setSelected([])} className="v3-btn v3-btn-ghost v3-btn-sm">Clear</button>
              </div>
            )}
          </div>

          {/* Question rows */}
          <div className="v3-card">
            <div className="divide-y divide-[#F0F1F3]">
              {rows.map((q) => (
                <div key={q._id} className={`px-5 py-4 transition-colors ${selected.includes(q._id) ? 'bg-[#F5F6F8]' : 'hover:bg-[#FAFBFC]'}`}>
                  <div className="flex gap-3">
                    <input type="checkbox" checked={selected.includes(q._id)} onChange={() => toggleOne(q._id)} className="mt-1 w-3.5 h-3.5 accent-[#111] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      {/* Top row: customer + date + badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-medium text-[#111]">{q.customerName}</p>
                        <p className="text-[11px] text-[#9CA3AF]">{new Date(q.createdAt).toLocaleDateString('en-PK')}</p>
                        {q.featured && <span className="v3-status v3-status-strong" style={{ fontSize: 9, padding: '1px 6px' }}>Featured</span>}
                        {q.reports > 0 && <span className="v3-status v3-status-pending" style={{ fontSize: 9, padding: '1px 6px' }}>{q.reports} report{q.reports > 1 ? 's' : ''}</span>}
                        {(q.answers || []).length === 0 && <span className="v3-status v3-status-inactive" style={{ fontSize: 9, padding: '1px 6px' }}>Unanswered</span>}
                      </div>
                      {/* Question body */}
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#4A4A4A]">{q.body}</p>
                      {/* Existing answers */}
                      {(q.answers || []).length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {q.answers.map((a) => (
                            <li key={a._id} className="border-l-2 border-[#E5E7EB] pl-3">
                              <p className="v3-h-label">
                                {a.isMerchant ? 'Your Answer' : a.authorName}
                                {a.status !== 'approved' && <span className="ml-1.5 text-[#9CA3AF]">· {a.status}</span>}
                              </p>
                              <p className="mt-1 text-[12px] text-[#4A4A4A]">{a.body}</p>
                              {!a.isMerchant && a.status === 'pending' && (
                                <div className="mt-2 flex gap-1.5">
                                  <button type="button" onClick={async () => { await api(`/questions/admin/${q._id}`, { method: 'PATCH', body: { answerId: a._id, answerStatus: 'approved' }, token: auth.token }); load(); }} className="v3-btn v3-btn-primary v3-btn-sm">Approve Answer</button>
                                  <button type="button" onClick={async () => { await api(`/questions/admin/${q._id}`, { method: 'PATCH', body: { answerId: a._id, answerStatus: 'rejected' }, token: auth.token }); load(); }} className="v3-btn v3-btn-ghost v3-btn-sm">Reject</button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {/* Product link */}
                      {q.product && (
                        <Link to={`/product/${q.product.slug}`} target="_blank" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#6B7280] hover:text-[#111]" style={{ textDecoration: 'none' }}>
                          {q.product.name} <ChevronRight size={10} />
                        </Link>
                      )}
                      {/* Inline reply */}
                      {replying === q._id && (
                        <div className="mt-3 border-t border-[#E5E7EB] pt-3">
                          <label className="v3-label mb-1.5">Public answer from HUSHAE</label>
                          <textarea className="v3-textarea" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="It runs true to size…" />
                          <p className="mt-1 text-[11px] text-[#9CA3AF]">Posting an answer also approves the question.</p>
                          <div className="mt-2 flex justify-end gap-2">
                            <button type="button" onClick={() => setReplying(null)} className="v3-btn v3-btn-ghost v3-btn-sm">Cancel</button>
                            <button type="button" onClick={() => sendReply(q._id)} disabled={busy === q._id} className="v3-btn v3-btn-primary v3-btn-sm">
                              <MessageSquare size={11} /> Post Answer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {tab !== 'approved' && <button type="button" disabled={busy === q._id} onClick={() => setStatus(q._id, 'approved')} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Approve"><Check size={13} /></button>}
                      {tab !== 'rejected' && <button type="button" disabled={busy === q._id} onClick={() => setStatus(q._id, 'rejected')} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Reject"><X size={13} /></button>}
                      <button type="button" onClick={() => { setReplying(replying === q._id ? null : q._id); setReply(''); }} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Answer"><MessageSquare size={13} /></button>
                      <button type="button" disabled={busy === q._id} onClick={() => del(q._id)} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
