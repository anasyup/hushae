import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Ban, ChevronLeft, ChevronRight, Copy, Download, Gift, Minus, Plus,
  Search, Settings as SettingsIcon, Sparkles, X,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * ADMIN → LOYALTY (members & gift cards)
 *
 * The settings page decides the RULES. This page is the day-to-day desk: who
 * has what, adjust a balance, block an abuser, issue a card.
 *
 * Two rules this screen follows:
 *  - The list is paginated and searched ON THE SERVER. Filtering a fixed fetch
 *    in the browser is a lie that breaks the moment the store grows.
 *  - Every manual adjustment demands a written reason, because it is recorded
 *    permanently in the ledger against the admin's name.
 * ========================================================================== */

const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const num = (n) => Number(n || 0).toLocaleString('en-PK');

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-500">{sub}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Adjust dialog — points or credit, up or down, always with a reason.
 * ------------------------------------------------------------------------- */
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

  // Escape closes; Tab is trapped inside. A dialog you cannot leave by
  // keyboard is an accessibility failure, not a detail.
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
    e.preventDefault();
    setErr(null);
    const value = Math.round(Number(amount) || 0);
    if (!value || value < 0) { setErr('Enter an amount greater than zero'); return; }
    if (!note.trim()) { setErr('Please say why — this is recorded permanently'); return; }
    setBusy(true);
    try {
      await api(`/loyalty/admin/accounts/${account._id}/adjust`, {
        method: 'POST', token: auth.token,
        body: { kind, amount: value * dir, note: note.trim() },
      });
      toast(`${kind === 'credit' ? 'Credit' : 'Points'} ${dir > 0 ? 'added' : 'removed'}`);
      onDone();
    } catch (ex) {
      setErr(ex.message || 'Could not adjust');
    }
    setBusy(false);
  };

  const have = kind === 'credit' ? account.creditBalance : account.pointsBalance;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="adj-title" className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="adj-title" className="text-[12px] font-semibold text-neutral-900">Adjust balance</h2>
            <p className="mt-0.5 truncate text-[12px] text-neutral-500">{account.name || 'Customer'} · {account.phone}</p>
          </div>
          <button ref={firstRef} type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div role="radiogroup" aria-label="What to adjust" className="mb-4 grid grid-cols-2 gap-2">
            {[['points', 'Points'], ['credit', 'Store credit']].map(([v, l]) => (
              <button
                key={v} type="button" role="radio" aria-checked={kind === v} onClick={() => setKind(v)}
                className={`min-h-[44px] rounded-xl border px-3 text-[13px] font-semibold transition ${kind === v ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}
              >{l}</button>
            ))}
          </div>

          <p className="mb-3 rounded-lg bg-neutral-50 px-3 py-2 text-[12px] text-neutral-600">
            Current: <strong>{kind === 'credit' ? money(have) : `${num(have)} points`}</strong>
          </p>

          <div role="radiogroup" aria-label="Add or remove" className="mb-4 grid grid-cols-2 gap-2">
            <button type="button" role="radio" aria-checked={dir === 1} onClick={() => setDir(1)} className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition ${dir === 1 ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}>
              <Plus size={14} /> Add
            </button>
            <button type="button" role="radio" aria-checked={dir === -1} onClick={() => setDir(-1)} className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition ${dir === -1 ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}>
              <Minus size={14} /> Remove
            </button>
          </div>

          <div className="mb-4">
            <label className="label" htmlFor="adj-amount">Amount {kind === 'credit' ? '(PKR)' : '(points)'}</label>
            <input id="adj-amount" className="input" type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="label" htmlFor="adj-note">Reason</label>
            <textarea id="adj-note" className="input min-h-[76px]" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Goodwill for late delivery on HS-20260712-004521" />
            <p className="mt-1.5 text-[11px] text-neutral-500">Saved against your name in the ledger, forever.</p>
          </div>

          {err && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">{err}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="min-h-[44px] flex-1 rounded-xl border border-neutral-300 px-4 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50">Cancel</button>
            <button type="submit" disabled={busy} className="min-h-[44px] flex-1 rounded-xl bg-neutral-900 px-4 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50">
              {busy ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Member detail drawer — balance, standing and the full statement.
 * ------------------------------------------------------------------------- */
function MemberPanel({ id, onClose, onChanged }) {
  const { auth, toast } = useApp();
  const [data, setData] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const closeRef = useRef(null);

  const load = useCallback(() => {
    api(`/loyalty/admin/accounts/${id}`, { token: auth.token })
      .then(setData)
      .catch(() => toast('Could not load this member'));
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Member details" className="flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 p-5">
          <div className="min-w-0">
            <h2 className="truncate text-[12px] font-semibold text-neutral-900">{a?.name || 'Member'}</h2>
            <p className="mt-0.5 truncate text-[12px] text-neutral-500">{a?.phone}{a?.email ? ` · ${a.email}` : ''}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!data ? <div className="skeleton h-64 w-full" /> : (
            <>
              {a.blocked && (
                <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
                  Blocked. {a.blockedReason || 'No reason recorded.'}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Points" value={num(a.pointsBalance)} />
                <StatCard label="Store credit" value={money(a.creditBalance)} />
                <StatCard label="Tier" value={a.tier || '—'} sub={`Qualifying spend ${money(a.tierSpend)}`} />
                <StatCard label="Referrals" value={num(a.referralCount)} sub={a.referralCode || '—'} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setAdjusting(true)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-[12px] font-semibold text-white transition hover:bg-neutral-800">
                  <Plus size={13} /> Adjust balance
                </button>
                <button type="button" onClick={toggleBlock} className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition ${a.blocked ? 'border-neutral-300 text-neutral-700 hover:bg-neutral-50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                  <Ban size={13} /> {a.blocked ? 'Unblock' : 'Block'}
                </button>
              </div>

              <h3 className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Statement</h3>
              {!data.ledger?.length ? (
                <p className="rounded-xl bg-neutral-50 px-4 py-6 text-center text-[12px] text-neutral-500">No movements yet.</p>
              ) : (
                <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                  {data.ledger.map((r) => (
                    <li key={r._id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium capitalize text-neutral-900">{String(r.reason || '').replace(/-/g, ' ')}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                          {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {r.orderNumber ? ` · ${r.orderNumber}` : ''}
                          {r.note ? ` · ${r.note}` : ''}
                          {r.actor && r.actor !== 'system' ? ` · by ${r.actor}` : ''}
                        </p>
                      </div>
                      <p className={`shrink-0 text-[13px] font-semibold tabular-nums ${r.amount > 0 ? 'text-emerald-700' : 'text-neutral-900'}`}>
                        {r.amount > 0 ? '+' : ''}{num(r.amount)}{r.kind === 'credit' ? ' PKR' : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {adjusting && a && (
        <AdjustDialog
          account={a}
          onClose={() => setAdjusting(false)}
          onDone={() => { setAdjusting(false); load(); onChanged(); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Create a gift card. The full code appears exactly once.
 * ------------------------------------------------------------------------- */
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
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await api('/loyalty/admin/gift-cards', {
        method: 'POST', token: auth.token,
        body: { amount: Number(amount) || 0, label: label.trim(), issuedTo: issuedTo.trim() },
      });
      setCode(r.code);
      onDone();
    } catch (ex) { setErr(ex.message || 'Could not create the card'); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="gc-title" className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="gc-title" className="text-[12px] font-semibold text-neutral-900">{code ? 'Card created' : 'New gift card'}</h2>
          <button ref={firstRef} type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        {code ? (
          <>
            <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-[12px] leading-relaxed text-amber-900">
              Copy this code now. It is stored scrambled, so it can never be shown again — only replaced.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 select-all break-all rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-[14px] font-semibold tracking-wide text-neutral-900">{code}</code>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(code); toast('Code copied'); }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-300 text-neutral-700 transition hover:bg-neutral-50"
                aria-label="Copy code"
              ><Copy size={15} /></button>
            </div>
            <button type="button" onClick={onClose} className="mt-4 min-h-[44px] w-full rounded-xl bg-neutral-900 px-4 text-[13px] font-semibold text-white transition hover:bg-neutral-800">Done</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="mb-4">
              <label className="label" htmlFor="gc-amount">Amount (PKR)</label>
              <input id="gc-amount" className="input" type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="label" htmlFor="gc-label">Label (only you see this)</label>
              <input id="gc-label" className="input" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Eid giveaway" />
            </div>
            <div className="mb-4">
              <label className="label" htmlFor="gc-to">Issued to (optional)</label>
              <input id="gc-to" className="input" maxLength={120} value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} placeholder="Phone or email" />
            </div>
            {err && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">{err}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="min-h-[44px] flex-1 rounded-xl border border-neutral-300 px-4 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50">Cancel</button>
              <button type="submit" disabled={busy} className="min-h-[44px] flex-1 rounded-xl bg-neutral-900 px-4 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50">
                {busy ? 'Creating…' : 'Create card'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */

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

  const loadStats = useCallback(() => {
    if (!auth?.token) return;
    api('/loyalty/admin/stats', { token: auth.token }).then(setStats).catch(() => {});
  }, [auth?.token]);

  /* Search runs on the server, debounced. Never fetch-everything-then-filter:
     it works at 34 members and dies at 34,000. */
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
    api('/loyalty/admin/gift-cards', { token: auth.token })
      .then((d) => setCards(d.cards || []))
      .catch(() => setCards([]));
  }, [auth?.token]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'gift-cards') loadCards(); }, [tab, loadCards]);
  useEffect(() => {
    if (tab !== 'members') return undefined;
    const t = setTimeout(loadMembers, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [tab, loadMembers, q]);

  // A new search must start at page 1, or an empty page 3 looks like no results.
  useEffect(() => { setPage(1); }, [q, tier, sort]);

  const exportCsv = async () => {
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/loyalty/admin/export`, { headers: { Authorization: `Bearer ${auth.token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'loyalty-ledger.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
            <Sparkles size={20} strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="font-sans text-2xl leading-tight text-neutral-900">Loyalty</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">Members, balances and gift cards.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <Download size={13} /> Export ledger
          </button>
          <Link to="/admin/settings/loyalty" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <SettingsIcon size={13} /> Rules
          </Link>
        </div>
      </div>

      {/* MEASURED: rendering this grid only once /admin/stats returned pushed
          the tabs and filters down 218px at 776ms — CLS 0.1466 against a
          0.0000 baseline on /admin/customers. The fix is not a spinner but a
          reservation: the same four cards are always in the DOM, showing a
          placeholder line of identical height until the numbers land. Heights
          are matched by using the same markup, not a guessed min-height. */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Members" value={stats ? num(stats.accounts) : '—'} />
        <StatCard label="Points outstanding" value={stats ? num(stats.points) : '—'} sub={stats ? `${num(stats.lifetimeEarned)} earned all time` : '\u00A0'} />
        <StatCard label="Store credit" value={stats ? money(stats.credit) : '—'} />
        <StatCard label="Gift cards live" value={stats ? money(stats.giftCards?.outstanding) : '—'} sub={stats ? `${num(stats.giftCards?.active)} active` : '\u00A0'} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {[['members', 'Members'], ['gift-cards', 'Gift cards']].map(([id, label]) => (
          <button
            key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
            className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition ${tab === id ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:text-neutral-900'}`}
          >{label}</button>
        ))}
      </div>

      {tab === 'members' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                className="input pl-9" type="search" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, phone, email or code" aria-label="Search members"
              />
            </div>
            {tiers.length > 0 && (
              <select className="input max-w-[160px]" value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Filter by tier">
                <option value="">All tiers</option>
                {tiers.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select className="input max-w-[180px]" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort members">
              <option value="points">Most points</option>
              <option value="spend">Highest spend</option>
              <option value="recent">Recently active</option>
            </select>
          </div>

          {rows === null ? (
            <div className="skeleton h-64 w-full" />
          ) : rows.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="font-sans text-xl text-neutral-900">{q || tier ? 'Nothing matched' : 'No members yet'}</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
                {q || tier
                  ? 'Try a different search, or clear the filters.'
                  : 'A member appears here the first time a customer earns points. Turn the programme on in Rules to start.'}
              </p>
            </div>
          ) : (
            <>
              {/* Cards on mobile, table on desktop — a 7-column table on a
                  360px phone is unreadable no matter how it is styled. */}
              <ul className="space-y-2 md:hidden">
                {rows.map((r) => (
                  <li key={r._id}>
                    <button type="button" onClick={() => setOpenId(r._id)} className="w-full rounded-xl border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-neutral-900">{r.name || 'Customer'}</p>
                          <p className="mt-0.5 truncate text-[11px] text-neutral-500">{r.phone}</p>
                        </div>
                        <p className="shrink-0 text-[13px] font-semibold tabular-nums text-neutral-900">{num(r.pointsBalance)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                        {r.tier && <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium capitalize text-neutral-700">{r.tier}</span>}
                        {r.creditBalance > 0 && <span>{money(r.creditBalance)} credit</span>}
                        <span>Spend {money(r.tierSpend)}</span>
                        {r.blocked && <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">Blocked</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-hidden rounded-xl border border-neutral-200 md:block">
                <table className="w-full text-left">
                  <caption className="sr-only">Loyalty members, {meta.total} in total</caption>
                  <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Member</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Tier</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Points</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Credit</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Spend</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Referrals</th>
                      <th scope="col" className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-[13px]">
                    {rows.map((r) => (
                      <tr key={r._id} className="bg-white transition hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900">{r.name || 'Customer'}{r.blocked && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Blocked</span>}</p>
                          <p className="mt-0.5 text-[11px] text-neutral-500">{r.phone}{r.email ? ` · ${r.email}` : ''}</p>
                        </td>
                        <td className="px-4 py-3 capitalize text-neutral-700">{r.tier || '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-neutral-900">{num(r.pointsBalance)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{r.creditBalance ? money(r.creditBalance) : '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{money(r.tierSpend)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{num(r.referralCount)}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => setOpenId(r._id)} className="min-h-[44px] rounded-lg border border-neutral-300 px-3 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-100">
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-[12px] text-neutral-500" aria-live="polite">
                  Page {meta.page} · {num(meta.total)} member{meta.total === 1 ? '' : 's'}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40">
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button type="button" onClick={() => setPage((p) => p + 1)} disabled={!meta.hasMore} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40">
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <button type="button" onClick={() => setNewCard(true)} className="mb-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-[12px] font-semibold text-white transition hover:bg-neutral-800">
            <Gift size={13} /> New gift card
          </button>

          {cards === null ? (
            <div className="skeleton h-48 w-full" />
          ) : cards.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="font-sans text-xl text-neutral-900">No gift cards yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
                Create one for a giveaway, an apology, or a customer who wants to buy a present.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {cards.map((c) => (
                <li key={c._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-neutral-900">
                      ····{c.last4}
                      {!c.active && <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">Disabled</span>}
                      {c.expiresAt && new Date(c.expiresAt) < new Date() && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Expired</span>}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                      {c.label || 'No label'}
                      {c.issuedTo ? ` · ${c.issuedTo}` : ''}
                      {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ' · no expiry'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-right">
                      <span className="block text-[13px] font-semibold tabular-nums text-neutral-900">{money(c.balance)}</span>
                      <span className="block text-[11px] text-neutral-500">of {money(c.initialAmount)}</span>
                    </p>
                    <button type="button" onClick={() => toggleCard(c)} className="min-h-[44px] rounded-lg border border-neutral-300 px-3 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
                      {c.active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {openId && (
        <MemberPanel
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => { loadMembers(); loadStats(); }}
        />
      )}
      {newCard && <NewCardDialog onClose={() => setNewCard(false)} onDone={() => { loadCards(); loadStats(); }} />}
    </AdminLayout>
  );
}
