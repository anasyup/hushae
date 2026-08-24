import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { fmtDate } from '../lib/format';
import {
  btnGhost, btnSolid, ctlInline, EditorialEmpty, EditorialPagination, MonoStatus, TableSkeleton,
} from './orders/orderUi';

const STATUS_LABEL = { draft: 'Draft', published: 'Published', scheduled: 'Scheduled', archived: 'Archived' };

export default function Blog() {
  const { auth, toast } = useApp();

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
    const base = `${window.location.origin}/blog/${slug}`;
    if (st === 'published' || (st === 'scheduled' && new Date() > new Date(rows?.find?.((r) => r.slug === slug)?.publishAt || 0))) {
      window.open(base, '_blank');
    } else {
      window.open(`${base}?preview=${encodeURIComponent(auth?.token || '')}`, '_blank');
    }
  };

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
      <PageHeader
        title="Blog"
        description={`${total} ${total === 1 ? 'post' : 'posts'} — fit guides, fabric stories, and updates.`}
        actions={<Link to="/admin/blog/new" className={btnSolid}><Plus size={12} /> New article</Link>}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Posts</p>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            className={`${ctlInline} w-56`}
            placeholder="Search title or slug…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            aria-label="Search articles"
          />
          {['', 'draft', 'published', 'scheduled', 'archived'].map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => { setStatus(s); setPage(1); }}
              className={status === s ? btnSolid : btnGhost}
            >
              {s ? STATUS_LABEL[s] : 'All'}
            </button>
          ))}
          <button type="button" onClick={load} className={`${btnGhost} ml-auto`}>
            <RefreshCcw size={12} /> Refresh
          </button>
        </div>

        {!rows ? (
          <TableSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <EditorialEmpty
            title="No articles found"
            description="Publish your first post, or adjust the filters above."
            action={<Link to="/admin/blog/new" className={btnGhost}>New article</Link>}
          />
        ) : (
          <>
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[minmax(0,1.6fr)_0.6fr_0.7fr_0.7fr_auto] md:gap-3">
              {['Title', 'Status', 'Author', 'Updated', ''].map((h) => <p key={h || 'a'} className="adm-label">{h}</p>)}
            </div>
            {rows.map((p) => (
              <div key={p._id} className="grid grid-cols-1 items-center gap-2 border-b border-[#F0F0F0] py-3 md:grid-cols-[minmax(0,1.6fr)_0.6fr_0.7fr_0.7fr_auto] md:gap-3 adm-row-hover">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-black">{p.title}</p>
                  <p className="truncate text-[11px] text-[#AAAAAA]">/blog/{p.slug}{p.viewCount > 0 ? ` · ${p.viewCount} views` : ''}</p>
                </div>
                <MonoStatus label={STATUS_LABEL[p.status] || p.status} dim={p.status !== 'published'} />
                <span className="text-[12px] text-[#999999]">{p.author || '—'}</span>
                <span className="text-[12px] text-[#AAAAAA]">
                  {p.status === 'scheduled' && p.publishAt
                    ? new Date(p.publishAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : fmtDate(p.updatedAt || p.createdAt)}
                </span>
                <div className="flex flex-wrap items-center gap-2 justify-self-start md:justify-self-end">
                  {(p.status === 'draft' || p.status === 'published') && (
                    <button type="button" onClick={() => togglePublish(p)} disabled={busy} className={btnGhost}>
                      {p.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                  )}
                  <button type="button" onClick={() => openSlug(p.slug, p.status)} className={btnGhost}>View</button>
                  <Link to={`/admin/blog/${p._id}`} className={btnGhost}>Edit</Link>
                  <button type="button" onClick={() => remove(p._id)} disabled={deleting === p._id} className={btnGhost}>
                    {deleting === p._id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
            <div className="mt-6">
              <EditorialPagination page={page} pages={pages} onPage={setPage} />
            </div>
          </>
        )}
      </section>
    </AdminLayout>
  );
}
