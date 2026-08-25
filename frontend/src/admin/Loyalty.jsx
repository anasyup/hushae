import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Ban, ChevronLeft, ChevronRight, Copy, Gift, Minus, Plus,
  Search, X,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * LOYALTY V3 — Phase 11 Video Pages Rebuild
 * Full V3 visual grammar: member summary, tabs, table, drawer, dialogs
 * All business logic preserved from original Loyalty.jsx (640 lines)
 * ========================================================================== */

const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const num = (n) => Number(n || 0).toLocaleString('en-PK');

/* ── Stat Card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub }) {
  return (
    <div className="p-5">
      <div className="v3-h-label mb-2">{label}</div>
      <div className="text-[20px] font-bold text-[#111] v3-tabular">{value}</div>
      {sub && <div className="text-[11px] text-[#9CA3AF] mt-1">{sub}</div>}
    </div>
  );
}

/* ── Adjust Dialog — points or credit, add or remove, always with reason ── */
function AdjustDialog({ account, onClose, onDone }) {
  const { auth, toast } = useApp();
  const [kind, setKind] = useState('points');
  const [dir, setDir] = useState(1);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const firstRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = panelRef.current?.querySelectorAll('button, input, textarea, select, [href]');
      if (!f || !f.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault(); setErr(null);
    const value = Math.round(Number(amount) || 0);
    if (!value || value < 0) { setErr('Enter an amount greater than zero'); return; }
    if (!note.trim()) { setErr('Please say why — this is recorded permanently'); return; }
    setBusy(true);
    try {
      await api(`/loyalty/admin/accounts/${account._id}/adjust`, {
        method: 'POST', token: auth.token, body: { kind, amount: value * dir, note: note.trim() },
      });
      toast(`${kind === 'credit' ? 'Credit' : 'Points'} ${dir > 0 ? 'added' : 'removed'}`);
      onDone();
    } catch (ex) { setErr(ex.message || 'Could not adjust'); }
    setBusy(false);
  };

  const have = kind === 'credit' ? account.creditBalance : account.pointsBalance;

  return (
    <div className="v3-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="adj-title" className="v3-modal" style={{ maxWidth: 440 }}>
        <div className="v3-modal-header">
          <div className="min-w-0">
            <h2 id="adj-title" className="v3-h-section">Adjust Balance</h2>
            <p className="text-[12px] text-[#6B7280] truncate">{account.name || 'Customer'} · {account.phone}</p>
          </div>
          <button ref={firstRef} type="button" onClick={onClose} className="v3-btn v3-btn-icon v3-btn-ghost"><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="v3-modal-body space-y-4">
            {/* Kind toggle */}
            <div className="grid grid-cols-2 gap-2">
              {[['points', 'Points'], ['credit', 'Store Credit']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setKind(v)}
                  className={`h-10 rounded-[5px] text-[12px] font-semibold transition-colors ${kind === v ? 'bg-[#111] text-white' : 'border border-[#E5E7EB] text-[#4A4A4A] hover:bg-[#F5F6F8]'}`}>
                  {l}
                </button>
              ))}
            </div>

            <div className="rounded-[5px] bg-[#F5F6F8] px-3 py-2 text-[12px] text-[#6B7280]">
              Current: <strong className="text-[#111]">{kind === 'credit' ? money(have) : `${num(have)} points`}</strong>
            </div>

            {/* Direction toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDir(1)}
                className={`h-10 rounded-[5px] text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${dir === 1 ? 'bg-[#111] text-white' : 'border border-[#E5E7EB] text-[#4A4A4A] hover:bg-[#F5F6F8]'}`}>
                <Plus size={13} /> Add
              </button>
              <button type="button" onClick={() => setDir(-1)}
                className={`h-10 rounded-[5px] text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${dir === -1 ? 'bg-[#111] text-white' : 'border border-[#E5E7EB] text-[#4A4A4A] hover:bg-[#F5F6F8]'}`}>
                <Minus size={13} /> Remove
              </button>
            </div>

            <div className="v3-field">
              <label className="v3-label">Amount {kind === 'credit' ? '(PKR)' : '(points)'}</label>
              <input className="v3-input" type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            </div>

            <div className="v3-field">
              <label className="v3-label">Reason</label>
              <textarea className="v3-textarea" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Goodwill for late delivery on HS-…" />
              <p className="v3-field-hint">Saved against your name in the ledger, forever.</p>
            </div>

            {err && <div role="alert" className="rounded-[5px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">{err}</div>}
          </div>
          <div className="v3-modal-footer">
            <button type="button" onClick={onClose} className="v3-btn v3-btn-secondary">Cancel</button>
            <button type="submit" disabled={busy} className="v3-btn v3-btn-primary">
              {busy ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Member Detail Drawer ──────────────────────────────────────────────── */
function MemberPanel({ id, onClose, onChanged }) {
  const { auth, toast } = useApp();
  const [data, setData] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const closeRef = useRef(null);

  const load = useCallback(() => {
    api(`/loyalty/admin/accounts/${id}`, { token: auth.token }).then(setData).catch(() => toast('Could not load this member'));
  }, [id, auth?.token, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !adjusting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, adjusting]);

  const toggleBlock = async () => {
    const next = !data.account.blocked;
    if (next && !confirm('Block this member? They keep their balance but stop earning and cannot redeem.')) return;
    try {
      await api(`/loyalty/admin/accounts/${id}/block`, { method: 'POST', token: auth.token, body: { blocked: next, reason: next ? 'Blocked from the admin panel' : '' } });
      toast(next ? 'Member blocked' : 'Member unblocked');
      load(); onChanged();
    } catch (e) { toast(e.message || 'Failed'); }
  };

  const a = data?.account;

  return (
    <>
      <div className="v3-drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} />
      <div role="dialog" aria-modal="true" aria-label="Member details" className="v3-drawer">
        <div className="v3-drawer-header">
          <div className="min-w-0">
            <h2 className="v3-h-section truncate">{a?.name || 'Member'}</h2>
            <p className="text-[12px] text-[#6B7280] truncate">{a?.phone}{a?.email ? ` · ${a.email}` : ''}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="v3-btn v3-btn-icon v3-btn-ghost"><X size={16} /></button>
        </div>

        <div className="v3-drawer-body">
          {!data ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 v3-skeleton rounded-[5px]" />)}</div>
          ) : (
            <>
              {a.blocked && (
                <div role="alert" className="mb-4 rounded-[5px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#991B1B]">
                  Blocked. {a.blockedReason || 'No reason recorded.'}
                </div>
              )}

              {/* Stats grid */}
              <div className="v3-card mb-4">
                <div className="grid grid-cols-2 divide-x divide-y divide-[#F0F1F3]">
                  <StatCard label="Points" value={num(a.pointsBalance)} />
                  <StatCard label="Store Credit" value={money(a.creditBalance)} />
                  <StatCard label="Tier" value={a.tier || '—'} sub={`Spend ${money(a.tierSpend)}`} />
                  <StatCard label="Referrals" value={num(a.referralCount)} sub={a.referralCode || '—'} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button type="button" onClick={() => setAdjusting(true)} className="v3-btn v3-btn-primary v3-btn-sm">
                  <Plus size={12} /> Adjust Balance
                </button>
                <button type="button" onClick={toggleBlock} className="v3-btn v3-btn-secondary v3-btn-sm">
                  <Ban size={12} /> {a.blocked ? 'Unblock' : 'Block'}
                </button>
              </div>

              {/* Statement */}
              <div className="v3-h-label mb-3">Statement</div>
              {!data.ledger?.length ? (
                <div className="v3-empty" style={{ padding: '24px 0' }}>
                  <p className="text-[12px] text-[#9CA3AF]">No movements yet.</p>
                </div>
              ) : (
                <div className="v3-card">
                  <div className="divide-y divide-[#F0F1F3]">
                    {data.ledger.map((r) => (
                      <div key={r._id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium capitalize text-[#111]">{String(r.reason || '').replace(/-/g, ' ')}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#9CA3AF]">
                            {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {r.orderNumber ? ` · ${r.orderNumber}` : ''}
                            {r.note ? ` · ${r.note}` : ''}
                            {r.actor && r.actor !== 'system' ? ` · by ${r.actor}` : ''}
                          </p>
                        </div>
                        <p className="shrink-0 text-[12px] font-semibold tabular text-[#111]">
                          {r.amount > 0 ? '+' : ''}{num(r.amount)}{r.kind === 'credit' ? ' PKR' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {adjusting && a && (
        <AdjustDialog account={a} onClose={() => setAdjusting(false)} onDone={() => { setAdjusting(false); load(); onChanged(); }} />
      )}
    </>
  );
}

/* ── New Gift Card Dialog ──────────────────────────────────────────────── */
function NewCardDialog({ onClose, onDone }) {
  const { auth, toast } = useApp();
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [code, setCode] = useState(null);
  const firstRef = useRef(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const r = await api('/loyalty/admin/gift-cards', {
        method: 'POST', token: auth.token, body: { amount: Number(amount) || 0, label: label.trim(), issuedTo: issuedTo.trim() },
      });
      setCode(r.code); onDone();
    } catch (ex) { setErr(ex.message || 'Could not create the card'); }
    setBusy(false);
  };

  return (
    <div className="v3-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="gc-title" className="v3-modal" style={{ maxWidth: 440 }}>
        <div className="v3-modal-header">
          <h2 id="gc-title" className="v3-h-section">{code ? 'Card Created' : 'New Gift Card'}</h2>
          <button ref={firstRef} type="button" onClick={onClose} className="v3-btn v3-btn-icon v3-btn-ghost"><X size={16} /></button>
        </div>
        {code ? (
          <div className="v3-modal-body space-y-4">
            <div className="rounded-[5px] bg-[#F5F6F8] px-4 py-3 text-[12px] text-[#4A4A4A]">
              Copy this code now. It is stored scrambled, so it can never be shown again.
            </div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 select-all break-all rounded-[5px] border border-[#E5E7EB] bg-white px-4 py-3 text-[12px] font-semibold tracking-wide text-[#111]">{code}</code>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(code); toast('Code copied'); }} className="v3-btn v3-btn-icon v3-btn-secondary" aria-label="Copy code"><Copy size={14} /></button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="v3-modal-body space-y-4">
              <div className="v3-field">
                <label className="v3-label">Amount (PKR)</label>
                <input className="v3-input" type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
              </div>
              <div className="v3-field">
                <label className="v3-label">Label (only you see this)</label>
                <input className="v3-input" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Eid giveaway" />
              </div>
              <div className="v3-field">
                <label className="v3-label">Issued to (optional)</label>
                <input className="v3-input" maxLength={120} value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} placeholder="Phone or email" />
              </div>
              {err && <div role="alert" className="rounded-[5px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">{err}</div>}
            </div>
            <div className="v3-modal-footer">
              <button type="button" onClick={onClose} className="v3-btn v3-btn-secondary">Cancel</button>
              <button type="submit" disabled={busy} className="v3-btn v3-btn-primary">{busy ? 'Creating…' : 'Create Card'}</button>
            </div>
          </form>
        )}
        {code && (
          <div className="v3-modal-footer">
            <button type="button" onClick={onClose} className="v3-btn v3-btn-primary w-full">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * MAIN LOYALTY COMPONENT
 * ══════════════════════════════════════════════════════════════════════════ */

export default function AdminLoyalty() {
  const { auth, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'gift-cards' ? 'gift-cards' : 'members';

  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, hasMore: false });
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [sort, setSort] = useState('points');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);

  const [cards, setCards] = useState(null);
  const [newCard, setNewCard] = useState(false);

  const setTab = (t) => { const p = new URLSearchParams(params); if (t === 'members') p.delete('tab'); else p.set('tab', t); setParams(p, { replace: true }); };

  const loadStats = useCallback(() => { if (!auth?.token) return; api('/loyalty/admin/stats', { token: auth.token }).then(setStats).catch(() => {}); }, [auth?.token]);

  const loadMembers = useCallback(() => {
    if (!auth?.token) return;
    const sp = new URLSearchParams({ page: String(page), limit: '25', sort });
    if (q.trim()) sp.set('q', q.trim());
    if (tier) sp.set('tier', tier);
    api(`/loyalty/admin/accounts?${sp}`, { token: auth.token })
      .then((d) => { setRows(d.accounts || []); setMeta({ total: d.total || 0, page: d.page || 1, hasMore: !!d.hasMore }); })
      .catch(() => { setRows([]); toast('Could not load members'); });
  }, [auth?.token, page, sort, q, tier, toast]);

  const loadCards = useCallback(() => {
    if (!auth?.token) return;
    api('/loyalty/admin/gift-cards', { token: auth.token }).then((d) => setCards(d.cards || [])).catch(() => setCards([]));
  }, [auth?.token]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'gift-cards') loadCards(); }, [tab, loadCards]);
  useEffect(() => {
    if (tab !== 'members') return undefined;
    const t = setTimeout(loadMembers, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [tab, loadMembers, q]);
  useEffect(() => { setPage(1); }, [q, tier, sort]);

  const exportCsv = async () => {
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/loyalty/admin/export`, { headers: { Authorization: `Bearer ${auth.token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'loyalty-ledger.csv';
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { toast(e.message || 'Export failed'); }
  };

  const toggleCard = async (c) => {
    try {
      await api(`/loyalty/admin/gift-cards/${c._id}`, { method: 'PATCH', token: auth.token, body: { active: !c.active } });
      toast(c.active ? 'Card disabled' : 'Card enabled');
      loadCards(); loadStats();
    } catch (e) { toast(e.message || 'Failed'); }
  };

  const tiers = stats?.byTier ? Object.keys(stats.byTier).filter((t) => t && t !== 'none') : [];

  return (
    <AdminLayout title="Loyalty">
      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb"><Link to="/admin">Home</Link><span>/</span><span>Loyalty</span></div>
          <h1 className="v3-h-page">Loyalty</h1>
          <p className="v3-h-small mt-1">Members, balances and gift cards.</p>
        </div>
        <div className="v3-page-header-right">
          <button type="button" onClick={exportCsv} className="v3-btn v3-btn-secondary v3-btn-sm">Export Ledger</button>
          <Link to="/admin/settings/loyalty" className="v3-btn v3-btn-secondary v3-btn-sm">Rules</Link>
        </div>
      </div>

      {/* ── SUMMARY STATS ────────────────────────────────────────────── */}
      <div className="v3-card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[#F0F1F3]">
          <StatCard label="Members" value={stats ? num(stats.accounts) : '—'} />
          <StatCard label="Points Outstanding" value={stats ? num(stats.points) : '—'} sub={stats ? `${num(stats.lifetimeEarned)} earned all time` : '\u00A0'} />
          <StatCard label="Store Credit" value={stats ? money(stats.credit) : '—'} />
          <StatCard label="Gift Cards Live" value={stats ? money(stats.giftCards?.outstanding) : '—'} sub={stats ? `${num(stats.giftCards?.active)} active` : '\u00A0'} />
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────── */}
      <div className="v3-tabs mb-6">
        {[['members', 'Members'], ['gift-cards', 'Gift Cards']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`v3-tab ${tab === id ? 'active' : ''}`}>{label}</button>
        ))}
      </div>

      {/* ── MEMBERS TAB ──────────────────────────────────────────────── */}
      {tab === 'members' ? (
        <>
          {/* Filter bar */}
          <div className="v3-filter-bar mb-4">
            <div className="relative flex-1" style={{ maxWidth: 280 }}>
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input className="v3-input" style={{ paddingLeft: 30, height: 30, fontSize: 12 }} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email…" aria-label="Search members" />
            </div>
            {tiers.length > 0 && (
              <select className="v3-select" style={{ height: 30, fontSize: 12, width: 140 }} value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Filter by tier">
                <option value="">All tiers</option>
                {tiers.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select className="v3-select" style={{ height: 30, fontSize: 12, width: 160 }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort members">
              <option value="points">Most points</option>
              <option value="spend">Highest spend</option>
              <option value="recent">Recently active</option>
            </select>
          </div>

          {rows === null ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 v3-skeleton rounded-[5px]" />)}</div>
          ) : rows.length === 0 ? (
            <div className="v3-card">
              <div className="v3-empty">
                <Gift size={24} className="v3-empty-icon" />
                <p className="v3-empty-title">{q || tier ? 'Nothing matched' : 'No members yet'}</p>
                <p className="v3-empty-desc">{q || tier ? 'Try a different search, or clear the filters.' : 'A member appears here the first time a customer earns points. Turn the programme on in Rules to start.'}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="space-y-2 md:hidden">
                {rows.map((r) => (
                  <li key={r._id}>
                    <button type="button" onClick={() => setOpenId(r._id)} className="w-full v3-card text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[#111]">{r.name || 'Customer'}</p>
                          <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">{r.phone}</p>
                        </div>
                        <p className="shrink-0 text-[13px] font-bold tabular text-[#111]">{num(r.pointsBalance)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#6B7280]">
                        {r.tier && <span className="v3-status v3-status-active" style={{ fontSize: 10 }}>{r.tier}</span>}
                        {r.creditBalance > 0 && <span>{money(r.creditBalance)} credit</span>}
                        <span>Spend {money(r.tierSpend)}</span>
                        {r.blocked && <span className="v3-status v3-status-inactive" style={{ fontSize: 10 }}>Blocked</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="v3-card hidden md:block">
                <div className="v3-table-wrap">
                  <table className="v3-table dense">
                    <caption className="sr-only">Loyalty members, {meta.total} in total</caption>
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Tier</th>
                        <th className="right">Points</th>
                        <th className="right">Credit</th>
                        <th className="right">Spend</th>
                        <th className="right">Referrals</th>
                        <th style={{ width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r._id}>
                          <td>
                            <p className="text-[13px] font-medium text-[#111]">{r.name || 'Customer'}{r.blocked && <span className="ml-2 v3-status v3-status-inactive" style={{ fontSize: 9 }}>Blocked</span>}</p>
                            <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{r.phone}{r.email ? ` · ${r.email}` : ''}</p>
                          </td>
                          <td className="text-[12px] capitalize text-[#4A4A4A]">{r.tier || '—'}</td>
                          <td className="right tabular text-[13px] font-semibold text-[#111]">{num(r.pointsBalance)}</td>
                          <td className="right tabular text-[12px] text-[#4A4A4A]">{r.creditBalance ? money(r.creditBalance) : '—'}</td>
                          <td className="right tabular text-[12px] text-[#4A4A4A]">{money(r.tierSpend)}</td>
                          <td className="right tabular text-[12px] text-[#4A4A4A]">{num(r.referralCount)}</td>
                          <td className="text-right">
                            <button type="button" onClick={() => setOpenId(r._id)} className="v3-btn v3-btn-secondary v3-btn-sm">Open</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="v3-pagination mt-4">
                <span>Page {meta.page} · {num(meta.total)} member{meta.total === 1 ? '' : 's'}</span>
                <div className="v3-pagination-controls">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="v3-pagination-btn"><ChevronLeft size={12} /></button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={!meta.hasMore} className="v3-pagination-btn"><ChevronRight size={12} /></button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* ── GIFT CARDS TAB ──────────────────────────────────────────── */
        <>
          <div className="mb-4">
            <button type="button" onClick={() => setNewCard(true)} className="v3-btn v3-btn-primary v3-btn-sm">
              <Gift size={12} /> New Gift Card
            </button>
          </div>

          {cards === null ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 v3-skeleton rounded-[5px]" />)}</div>
          ) : cards.length === 0 ? (
            <div className="v3-card">
              <div className="v3-empty">
                <Gift size={24} className="v3-empty-icon" />
                <p className="v3-empty-title">No gift cards yet</p>
                <p className="v3-empty-desc">Create one for a giveaway, an apology, or a customer who wants to buy a present.</p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {cards.map((c) => (
                <li key={c._id} className="v3-card">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#111]">
                        ····{c.last4}
                        {!c.active && <span className="ml-2 v3-status v3-status-inactive" style={{ fontSize: 10 }}>Disabled</span>}
                        {c.expiresAt && new Date(c.expiresAt) < new Date() && <span className="ml-2 v3-status v3-status-inactive" style={{ fontSize: 10 }}>Expired</span>}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#6B7280]">
                        {c.label || 'No label'}{c.issuedTo ? ` · ${c.issuedTo}` : ''}
                        {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ' · no expiry'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-right">
                        <span className="block text-[13px] font-bold tabular text-[#111]">{money(c.balance)}</span>
                        <span className="block text-[11px] text-[#9CA3AF]">of {money(c.initialAmount)}</span>
                      </p>
                      <button type="button" onClick={() => toggleCard(c)} className="v3-btn v3-btn-secondary v3-btn-sm">{c.active ? 'Disable' : 'Enable'}</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {openId && <MemberPanel id={openId} onClose={() => setOpenId(null)} onChanged={() => { loadMembers(); loadStats(); }} />}
      {newCard && <NewCardDialog onClose={() => setNewCard(false)} onDone={() => { loadCards(); loadStats(); }} />}
    </AdminLayout>
  );
}
