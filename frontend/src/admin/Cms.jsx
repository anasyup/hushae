import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { PAGE_TYPES, STATE_LABEL, typeOf } from './cms/pageTypes';
import {
  btnGhost, btnSolid, ctlInline, EditorialEmpty, MonoStatus, TableSkeleton,
} from './orders/orderUi';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function StateLine({ state, hasDraft }) {
  const r = state?.reason || 'draft';
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <MonoStatus label={STATE_LABEL[r] || r} dim={r !== 'live'} />
      {hasDraft && <span className="text-[10px] uppercase tracking-[0.14em] text-[#AAAAAA]">Unpublished edits</span>}
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
      <PageHeader
        title="Pages"
        description="Your own pages — size guide, about us, returns policy."
        actions={(
          <>
            <Link to="/admin/cms/redirects" className={btnGhost}>Old addresses</Link>
            <Link to="/admin/cms/new" className={btnSolid}><Plus size={12} /> New page</Link>
          </>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Overview</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] md:grid-cols-4">
          {[
            { label: 'Live', value: counts.live },
            { label: 'Draft', value: counts.draft },
            { label: 'Scheduled', value: counts.scheduled },
            { label: 'Total pages', value: total },
          ].map((x) => (
            <div key={x.label} className="px-5 py-6">
              <p className="adm-label">{x.label}</p>
              <p className="adm-metric mt-3 text-[26px] text-black">{x.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="adm-index">02 — Pages</p>
        <form
          className="mb-4 flex flex-wrap items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); setParam('q', term.trim()); }}
        >
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Search pages by name or address"
            placeholder="Search pages…"
            className={`${ctlInline} min-w-0 flex-1 sm:max-w-xs`}
          />
          <button type="submit" className={btnGhost}>Search</button>
          <select
            id="cms-type" value={type} onChange={(e) => setParam('type', e.target.value)}
            className={`${ctlInline} ml-auto`} aria-label="Filter by page kind"
          >
            <option value="">All kinds</option>
            {PAGE_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
        </form>

        <div className="mb-4 flex flex-wrap gap-2">
          {[['', 'All', counts.all], ['published', 'Live', counts.live], ['draft', 'Draft', counts.draft],
            ['scheduled', 'Scheduled', counts.scheduled], ['archived', 'Archived', counts.archived]].map(([id, label, n]) => (
              <button
                key={id || 'all'} type="button" onClick={() => setParam('status', id)}
                aria-pressed={status === id}
                className={status === id ? btnSolid : btnGhost}
              >
                {label} <span className="text-[#AAAAAA]">{n}</span>
              </button>
          ))}
        </div>

        {rows === null ? (
          <TableSkeleton rows={6} />
        ) : !rows.length ? (
          <EditorialEmpty
            title={status || type || q ? 'Nothing in this group' : 'No pages yet'}
            description={status || type || q
              ? 'Try another filter, or clear the search.'
              : 'A page is anything with its own web address — a size guide, an about page, your returns policy. Nothing goes live until you press Publish.'}
            action={!(status || type || q) && (
              <Link to="/admin/cms/new" className={btnSolid}><Plus size={12} /> Create your first page</Link>
            )}
          />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 border-y border-[#EAEAEA] py-3">
              <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-[12px] text-[#555555]">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 accent-white" />
                Select all ({rows.length})
              </label>
              {selected.length > 0 && (
                <>
                  <span className="text-[12px] text-[#999999]">{selected.length} selected</span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => bulk('publish')} className={btnGhost}>Publish</button>
                    <button type="button" disabled={busy} onClick={() => bulk('unpublish')} className={btnGhost}>Hide</button>
                    <button type="button" disabled={busy} onClick={() => bulk('archive')} className={btnGhost}>Archive</button>
                    <button type="button" disabled={busy} onClick={() => bulk('delete')} className={btnGhost}>Delete</button>
                  </div>
                </>
              )}
            </div>

            <ul className="space-y-0 md:hidden">
              {rows.map((p) => (
                <li key={p._id} className="border-b border-[#EAEAEA] py-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleOne(p._id)}
                      aria-label={`Select ${p.title}`} className="mt-1 h-4 w-4 shrink-0 accent-white"
                    />
                    <Link to={`/admin/cms/${p._id}`} className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-black">{p.title}</p>
                      <p className="mt-0.5 truncate text-[12px] text-[#AAAAAA]">/{p.slug} · {typeOf(p.type).short}</p>
                    </Link>
                  </div>
                  <div className="mt-2 pl-7"><StateLine state={p.state} hasDraft={p.hasDraft} /></div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 pl-7 text-[11px] text-[#AAAAAA]">
                    <span>Edited {fmtDate(p.updatedAt)}</span>
                    {p.state?.reason === 'scheduled' && p.publishAt && <span>Goes live {fmtWhen(p.publishAt)}</span>}
                    {p.showInFooter && <span>In footer</span>}
                    {p.locked && <span>Built in</span>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[2rem_minmax(0,1.6fr)_0.6fr_0.9fr_0.7fr_4rem] gap-3 border-b border-[#EAEAEA] py-2">
                  <span>
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all pages" className="h-4 w-4 accent-white" />
                  </span>
                  {['Page', 'Kind', 'Status', 'Updated', 'View'].map((h) => <p key={h} className="adm-label">{h}</p>)}
                </div>
                {rows.map((p) => (
                  <div key={p._id} className="grid grid-cols-[2rem_minmax(0,1.6fr)_0.6fr_0.9fr_0.7fr_4rem] items-center gap-3 border-b border-[#F0F0F0] py-3 adm-row-hover">
                    <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleOne(p._id)} aria-label={`Select ${p.title}`} className="h-4 w-4 accent-white" />
                    <div className="min-w-0">
                      <Link to={`/admin/cms/${p._id}`} className="text-[13px] text-black hover:underline">{p.title}</Link>
                      <p className="mt-0.5 truncate text-[11px] text-[#AAAAAA]">
                        /{p.slug}
                        {p.locked && ' · built in'}
                        {p.showInFooter && ' · footer'}
                        {p.showInHeader && ' · menu'}
                      </p>
                    </div>
                    <span className="text-[12px] text-[#999999]">{typeOf(p.type).short}</span>
                    <div>
                      <StateLine state={p.state} hasDraft={p.hasDraft} />
                      {p.state?.reason === 'scheduled' && p.publishAt && (
                        <p className="mt-1 text-[11px] text-[#AAAAAA]">{fmtWhen(p.publishAt)}</p>
                      )}
                    </div>
                    <span className="text-[12px] text-[#999999]">{fmtDate(p.updatedAt)}</span>
                    <span className="text-right">
                      {p.state?.live ? (
                        <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="text-[11px] uppercase tracking-[0.14em] text-[#999999] hover:text-black">
                          Open
                        </a>
                      ) : <span className="text-white/20">—</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </AdminLayout>
  );
}
