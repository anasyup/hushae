import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, Eye, FileText, Globe, Loader2, Pencil, Plus, RefreshCcw,
  Search, Trash2,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { fmtDate } from '../lib/format';

/* ============================================================================
 * ADMIN → BLOG — article management (list + status filter + search).
 * Shopify-style: status pills, draft vs published, inline actions.
 * ========================================================================== */

const STATUS_PILL = {
  draft:     'bg-amber-50 text-amber-700 ring-amber-200',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  scheduled: 'bg-blue-50 text-blue-700 ring-blue-200',
  archived:  'bg-neutral-100 text-neutral-500 ring-neutral-200',
};

const STATUS_LABEL = { draft: 'Draft', published: 'Published', scheduled: 'Scheduled', archived: 'Archived' };

export default function Blog() {
  const { auth, toast } = useApp();
  const nav = useNavigate();

  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (q.trim()) params.set('q', q.trim());
      if (status) params.set('status', status);
      const d = await api(`/blog/admin?${params}`, { token: auth?.token });
      setRows(d.posts || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
    } catch {
      toast('Could not load articles');
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [page, q, status, auth?.token, toast]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!window.confirm('Delete this article permanently?')) return;
    setDeleting(id);
    try {
      await api(`/blog/admin/${id}`, { method: 'DELETE', token: auth?.token });
      toast('Article deleted');
      load();
    } catch {
      toast('Could not delete — try again');
    } finally {
      setDeleting(null);
    }
  };

  const openSlug = (slug, st) => {
    // Live preview for published posts; admin preview token for drafts.
    const base = `${window.location.origin}/blog/${slug}`;
    if (st === 'published' || (st === 'scheduled' && new Date() > new Date(rows?.find?.((r) => r.slug === slug)?.publishAt || 0))) {
      window.open(base, '_blank');
    } else {
      window.open(`${base}?preview=${encodeURIComponent(auth?.token || '')}`, '_blank');
    }
  };

  /* One-click publish / unpublish straight from the list (Shopify-style). */
  const togglePublish = async (p) => {
    const to = p.status === 'published' ? 'draft' : 'published';
    setBusy(true);
    try {
      await api(`/blog/admin/${p._id}`, { method: 'PUT', token: auth?.token, body: { status: to } });
      toast(to === 'published' ? 'Article published' : 'Article moved to draft');
      load();
    } catch {
      toast('Could not change status');
    }
    setBusy(false);
  };

  return (
    <AdminLayout title="Blog">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-sans text-lg font-semibold text-neutral-900">Articles</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            {total} {total === 1 ? 'post' : 'posts'} — fit guides, fabric stories, and updates that bring organic traffic.
          </p>
        </div>
        <Link to="/admin/blog/new" className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black">
          <Plus size={14} /> New article
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="w-64 rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-[13px] outline-none transition focus:border-neutral-900"
            placeholder="Search title or slug…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        {['', 'draft', 'published', 'scheduled', 'archived'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${status === s ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-400'}`}
          >
            {s ? STATUS_LABEL[s] : 'All'}
          </button>
        ))}
        <button onClick={load} className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-600 ring-1 ring-neutral-200 transition hover:ring-neutral-400">
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {!rows ? (
          <div className="grid place-items-center py-20"><Loader2 size={22} className="animate-spin text-neutral-300" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={28} className="mx-auto text-neutral-300" />
            <p className="mt-3 text-[13px] font-medium text-neutral-600">No articles found</p>
            <p className="mt-1 text-[12px] text-neutral-400">Publish your first post, or adjust the filters above.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {rows.map((p) => (
              <div key={p._id} className="group flex items-center gap-4 px-4 py-3.5 transition hover:bg-neutral-50/70">
                <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {p.coverImage ? (
                    <img src={p.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[9px] font-bold uppercase tracking-widest text-neutral-400">HUSHAE</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${STATUS_PILL[p.status] || STATUS_PILL.draft}`}>{STATUS_LABEL[p.status] || p.status}</span>
                    {p.status === 'scheduled' && p.publishAt && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-400"><Calendar size={10} />{new Date(p.publishAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[14px] font-semibold text-neutral-900">{p.title}</p>
                  <p className="truncate text-[12px] text-neutral-400">
                    /blog/{p.slug} · {p.author || 'no author'} · {fmtDate(p.updatedAt || p.createdAt)}
                    {p.viewCount > 0 && <> · <Eye size={10} className="inline" /> {p.viewCount}</>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {(p.status === 'draft' || p.status === 'published') && (
                    <button
                      onClick={() => togglePublish(p)}
                      disabled={busy}
                      className={`rounded-lg px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${p.status === 'published' ? 'text-neutral-500 hover:bg-amber-50 hover:text-amber-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                      title={p.status === 'published' ? 'Move to draft' : 'Publish now'}
                    >
                      {p.status === 'published' ? <><Globe size={12} className="inline" /> Unpublish</> : <><Globe size={12} className="inline" /> Publish</>}
                    </button>
                  )}
                  <button onClick={() => openSlug(p.slug, p.status)} className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700" title="View article">
                    <Eye size={15} />
                  </button>
                  <Link to={`/admin/blog/${p._id}`} className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700" title="Edit">
                    <Pencil size={15} />
                  </Link>
                  <button onClick={() => remove(p._id)} disabled={deleting === p._id} className="rounded-lg p-2 text-neutral-400 transition hover:bg-red-50 hover:text-red-600" title="Delete">
                    {deleting === p._id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-neutral-600 ring-1 ring-neutral-200 disabled:opacity-40">← Prev</button>
          <span className="px-2 text-[12px] font-medium text-neutral-500">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-neutral-600 ring-1 ring-neutral-200 disabled:opacity-40">Next →</button>
        </div>
      )}
    </AdminLayout>
  );
}
