import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink, FileText, Plus, Search, Signpost, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import { Empty, Stat } from './ui/Controls';
import { PAGE_TYPES, STATE_LABEL, STATE_STYLE, typeOf } from './cms/pageTypes';

/* ============================================================================
 * ADMIN → PAGES (CMS)
 *
 * MEASURED BEFORE WRITING THIS
 *   /privacy /terms /returns /shipping-policy render from a hardcoded DOCS
 *   object in frontend/src/pages/Legal.jsx. The merchant cannot change one
 *   word of their own returns policy without a developer. Sprint 2L Part 1
 *   built the backend; this is the first screen that lets a human reach it.
 *
 * The state pill is the point of the list. A bare Published/Draft badge makes
 * "draft", "goes live on Friday" and "expired last week" look identical, so
 * the server returns liveState() = { live, reason } and this renders the
 * reason — the same decision the promotions list made.
 *
 * Filters live in the URL so a merchant can bookmark "everything still in
 * draft" and Back does what they expect.
 * ========================================================================== */

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function StatePill({ state, hasDraft }) {
  const r = state?.reason || 'draft';
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATE_STYLE[r] || STATE_STYLE.draft}`}>
        {STATE_LABEL[r] || r}
      </span>
      {/* A live page with unsaved edits waiting behind it is the single most
          confusing CMS state. Say so rather than leaving it to be discovered. */}
      {hasDraft && (
        <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-800 ring-1 ring-violet-200">
          Unpublished edits
        </span>
      )}
    </span>
  );
}

export default function Cms() {
  const { auth, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const type = params.get('type') || '';
  const q = params.get('q') || '';

  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [term, setTerm] = useState(q);

  /* NOTE gotcha 68: this callback must NOT be handed straight to useEffect as
     its effect body — an async function returns a Promise and React calls the
     return value as a cleanup, which blanked two admin screens in Sprint 2K. */
  const load = useCallback(() => {
    if (!auth?.token) return;
    const qs = new URLSearchParams({ limit: '100' });
    if (status) qs.set('status', status);
    if (type) qs.set('type', type);
    if (q) qs.set('q', q);
    api(`/cms/pages?${qs}`, { token: auth.token })
      .then((d) => { setRows(d.pages || []); setTotal(d.total || 0); setSelected([]); })
      .catch(() => { setRows([]); toast('Could not load pages'); });
  }, [auth?.token, status, type, q, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setTerm(q); }, [q]);

  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p);
  };

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0, live: 0, draft: 0, scheduled: 0, archived: 0 };
    (rows || []).forEach((r) => {
      const s = r.state?.reason;
      if (s === 'live') c.live += 1;
      else if (s === 'scheduled') c.scheduled += 1;
      else if (s === 'archived') c.archived += 1;
      else c.draft += 1;
    });
    return c;
  }, [rows]);

  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allChecked = rows?.length > 0 && selected.length === rows.length;
  const toggleAll = () => setSelected(allChecked ? [] : (rows || []).map((r) => r._id));

  const bulk = async (action) => {
    if (!selected.length) return;
    if (action === 'delete') {
      const locked = (rows || []).filter((r) => selected.includes(r._id) && r.locked).length;
      const msg = locked
        ? `Delete ${selected.length} page(s)? ${locked} of them are built into the shop and will be skipped.`
        : `Delete ${selected.length} page(s)? This cannot be undone.`;
      if (!window.confirm(msg)) return;
    }
    if (action === 'publish' && !window.confirm(`Make ${selected.length} page(s) visible to customers right now?`)) return;
    setBusy(true);
    try {
      const r = await api('/cms/pages/bulk', { method: 'POST', token: auth.token, body: { ids: selected, action } });
      toast(`${r.affected} page${r.affected === 1 ? '' : 's'} updated`);
      load();
    } catch (e) { toast(e.message || 'Failed'); } finally { setBusy(false); }
  };

  return (
    <AdminLayout title="Pages">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
            <FileText size={20} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="font-sans text-2xl leading-tight text-neutral-900">Pages</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">
              Your own pages — size guide, about us, returns policy. Write it here, it appears on the shop.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/cms/redirects" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <Signpost size={13} aria-hidden="true" /> Old addresses
          </Link>
          <Link to="/admin/cms/new" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[12px] font-semibold text-white transition hover:bg-neutral-800">
            <Plus size={13} aria-hidden="true" /> New page
          </Link>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Live" value={counts.live} />
        <Stat label="Draft" value={counts.draft} />
        <Stat label="Scheduled" value={counts.scheduled} />
        <Stat label="Total pages" value={total} />
      </div>

      {/* ---- search + type ---- */}
      <form
        className="mb-4 flex flex-wrap items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); setParam('q', term.trim()); }}
      >
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Search pages by name or address"
            placeholder="Search pages…"
            className="h-11 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-[13px] text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <button type="submit" className="min-h-[44px] rounded-lg border border-neutral-300 px-4 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
          Search
        </button>
        <div className="ml-auto">
          <label htmlFor="cms-type" className="sr-only">Filter by page kind</label>
          <select
            id="cms-type" value={type} onChange={(e) => setParam('type', e.target.value)}
            className="h-11 rounded-lg border border-neutral-300 bg-white px-3 text-[13px] text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          >
            <option value="">All kinds</option>
            {PAGE_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
        </div>
      </form>

      {/* ---- status filter ---- */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[['', 'All', counts.all], ['published', 'Live', counts.live], ['draft', 'Draft', counts.draft],
          ['scheduled', 'Scheduled', counts.scheduled], ['archived', 'Archived', counts.archived]].map(([id, label, n]) => (
            <button
              key={id || 'all'} type="button" onClick={() => setParam('status', id)}
              aria-pressed={status === id}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-medium transition ${status === id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'}`}
            >
              {label}
              {!status && <span className={status === id ? 'text-white/70' : 'text-neutral-500'}>{n}</span>}
            </button>
        ))}
      </div>

      {rows === null ? (
        <div className="skeleton h-64 w-full" />
      ) : !rows.length ? (
        <Empty
          title={status || type || q ? 'Nothing in this group' : 'No pages yet'}
          description={status || type || q
            ? 'Try another filter, or clear the search.'
            : 'A page is anything with its own web address — a size guide, an about page, your returns policy. Nothing goes live until you press Publish.'}
          action={!(status || type || q) && (
            <Link to="/admin/cms/new" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[12px] font-semibold text-white transition hover:bg-neutral-800">
              <Plus size={13} aria-hidden="true" /> Create your first page
            </Link>
          )}
        />
      ) : (
        <>
          {/* Bulk bar. Actions only appear with a selection so they never
              compete with the list for attention. */}
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[12px] font-medium text-neutral-700">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 accent-neutral-900" />
              Select all ({rows.length})
            </label>
            {selected.length > 0 && (
              <>
                <span className="text-[12px] text-neutral-600">{selected.length} selected</span>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => bulk('publish')} className="min-h-[44px] rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">Publish</button>
                  <button type="button" disabled={busy} onClick={() => bulk('unpublish')} className="min-h-[44px] rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">Hide</button>
                  <button type="button" disabled={busy} onClick={() => bulk('archive')} className="min-h-[44px] rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">Archive</button>
                  <button type="button" disabled={busy} onClick={() => bulk('delete')} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-red-200 px-3 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                    <Trash2 size={13} aria-hidden="true" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Cards on mobile, table from md. A six-column table on a 360px
              phone is unreadable however it is styled — measured in 2K. */}
          <ul className="space-y-2 md:hidden">
            {rows.map((p) => (
              <li key={p._id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleOne(p._id)}
                    aria-label={`Select ${p.title}`} className="mt-1 h-4 w-4 shrink-0 accent-neutral-900"
                  />
                  <Link to={`/admin/cms/${p._id}`} className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-neutral-900">{p.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-neutral-600">/{p.slug} · {typeOf(p.type).short}</p>
                  </Link>
                </div>
                <div className="mt-2 pl-7"><StatePill state={p.state} hasDraft={p.hasDraft} /></div>
                <div className="mt-2 flex flex-wrap items-center gap-3 pl-7 text-[11px] text-neutral-600">
                  <span>Edited {fmtDate(p.updatedAt)}</span>
                  {p.state?.reason === 'scheduled' && p.publishAt && <span>Goes live {fmtWhen(p.publishAt)}</span>}
                  {p.showInFooter && <span>In footer</span>}
                  {p.locked && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-900">Built in</span>}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-neutral-200 md:block">
            <table className="w-full text-left">
              <caption className="sr-only">Pages, {rows.length} shown</caption>
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-600">
                <tr>
                  <th scope="col" className="w-10 px-4 py-3">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all pages" className="h-4 w-4 accent-neutral-900" />
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">Page</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Kind</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last edited</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-[13px]">
                {rows.map((p) => (
                  <tr key={p._id} className="bg-white transition hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleOne(p._id)} aria-label={`Select ${p.title}`} className="h-4 w-4 accent-neutral-900" />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/cms/${p._id}`} className="font-medium text-neutral-900 underline-offset-2 hover:underline">{p.title}</Link>
                      <p className="mt-0.5 text-[11px] text-neutral-600">
                        /{p.slug}
                        {p.locked && ' · built in'}
                        {p.showInFooter && ' · footer'}
                        {p.showInHeader && ' · menu'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{typeOf(p.type).short}</td>
                    <td className="px-4 py-3">
                      <StatePill state={p.state} hasDraft={p.hasDraft} />
                      {p.state?.reason === 'scheduled' && p.publishAt && (
                        <p className="mt-1 text-[11px] text-neutral-600">{fmtWhen(p.publishAt)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{fmtDate(p.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.state?.live ? (
                        <a
                          href={`/${p.slug}`} target="_blank" rel="noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1 text-[12px] font-semibold text-neutral-700 underline-offset-2 hover:underline"
                        >
                          Open <ExternalLink size={12} aria-hidden="true" />
                          <span className="sr-only">{p.title} in a new tab</span>
                        </a>
                      ) : <span className="text-[12px] text-neutral-500">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
