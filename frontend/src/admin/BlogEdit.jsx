import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, Save } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import MediaPicker from '../components/MediaPicker';
import BlogMarkdown from '../components/BlogMarkdown';

/* ============================================================================
 * ADMIN → BLOG → EDIT — create / edit an article.
 *
 * Left: fields. Right: live preview of the markdown body. Slug autofills from
 * the title (editable). Status drives visibility: draft (hidden), published
 * (live), scheduled (live after publishAt), archived (hidden).
 * ========================================================================== */

const STATUSES = [
  { id: 'draft', label: 'Draft', hint: 'Hidden — visible only to you' },
  { id: 'published', label: 'Published', hint: 'Live on /blog now' },
  { id: 'scheduled', label: 'Scheduled', hint: 'Goes live at the date below' },
  { id: 'archived', label: 'Archived', hint: 'Hidden from the site' },
];

const inputCls = 'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-neutral-900';
const labelCls = 'mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500';

const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function BlogEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { auth, toast, settings } = useApp();
  const isNew = id === 'new' || !id;

  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', content: '', coverImage: '', coverAlt: '',
    author: '', tags: '', status: 'draft', publishAt: '',
    seo: { title: '', description: '', noIndex: false },
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (isNew) { setLoaded(true); return; }
    let alive = true;
    api(`/blog/admin/${id}`, { token: auth?.token })
      .then((d) => {
        if (!alive) return;
        const p = d.post || {};
        setForm({
          title: p.title || '', slug: p.slug || '', excerpt: p.excerpt || '',
          content: p.content || '', coverImage: p.coverImage || '', coverAlt: p.coverAlt || '',
          author: p.author || '', tags: (p.tags || []).join(', '),
          status: p.status || 'draft',
          publishAt: p.publishAt ? new Date(p.publishAt).toISOString().slice(0, 16) : '',
          seo: { title: p.seo?.title || '', description: p.seo?.description || '', noIndex: !!p.seo?.noIndex },
        });
        setLoaded(true);
      })
      .catch(() => { toast('Could not load article'); nav('/admin/blog'); });
    return () => { alive = false; };
  }, [id, isNew, auth?.token, toast, nav]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSeo = (k, v) => setForm((f) => ({ ...f, seo: { ...f.seo, [k]: v } }));

  const onTitle = (v) => {
    set('title', v);
    if (!slugTouched) set('slug', slugify(v));
  };

  const tagsList = useMemo(() => form.tags.split(',').map((t) => t.trim()).filter(Boolean), [form.tags]);

  const save = async () => {
    if (!form.title.trim()) { toast('Title is required'); return; }
    setSaving(true);
    const body = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt,
      content: form.content,
      coverImage: form.coverImage,
      coverAlt: form.coverAlt,
      author: form.author,
      tags: tagsList,
      status: form.status,
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      seo: {
        title: form.seo.title || form.title,
        description: form.seo.description || form.excerpt,
        noIndex: form.seo.noIndex,
      },
    };
    try {
      const d = isNew
        ? await api('/blog/admin', { method: 'POST', token: auth?.token, body })
        : await api(`/blog/admin/${id}`, { method: 'PUT', token: auth?.token, body });
      toast(isNew ? 'Article created' : 'Article saved');
      nav(`/admin/blog/${d.post._id}`, { replace: true });
    } catch (ex) {
      toast(ex.message || 'Could not save — try again');
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = useMemo(() => {
    if (!form.slug) return '';
    const base = `${window.location.origin}/blog/${form.slug}`;
    if (form.status === 'published' || (form.status === 'scheduled' && form.publishAt && new Date(form.publishAt) <= new Date())) {
      return base;
    }
    return `${base}?preview=${encodeURIComponent(auth?.token || '')}`;
  }, [form.slug, form.status, form.publishAt, auth?.token]);

  if (!loaded) {
    return (
      <AdminLayout title="Article editor">
        <div className="grid h-96 place-items-center"><Loader2 size={22} className="animate-spin text-neutral-300" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isNew ? 'New article' : 'Edit article'}>
      <div className="mb-5 flex items-center justify-between">
        <Link to="/admin/blog" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 transition hover:text-neutral-900">
          <ArrowLeft size={14} /> All articles
        </Link>
        <div className="flex items-center gap-2">
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-neutral-700 ring-1 ring-neutral-200 transition hover:ring-neutral-400">
              <Eye size={14} /> Preview
            </a>
          )}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- Left: fields ---- */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={form.title} onChange={(e) => onTitle(e.target.value)} placeholder="How to find your perfect bra size" />
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <label className={labelCls}>Slug</label>
            <div className="flex items-center gap-1 rounded-xl border border-neutral-300 bg-neutral-50 px-3 focus-within:border-neutral-900">
              <span className="whitespace-nowrap text-[12px] text-neutral-400">/blog/</span>
              <input
                className="w-full bg-transparent py-2 text-[13px] outline-none"
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}
                placeholder="how-to-find-your-perfect-bra-size"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-neutral-400">Auto-filled from the title. Lowercase letters, numbers, dashes.</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <label className={labelCls}>Excerpt</label>
            <textarea
              className={`${inputCls} min-h-20 resize-y`}
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              placeholder="One or two lines shown on the /blog list and used as the search-engine description."
            />
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <label className={labelCls}>Cover image</label>
            <MediaPicker value={form.coverImage} onChange={(url) => set('coverImage', url)} />
            <div className="mt-3">
              <label className={labelCls}>Cover alt text</label>
              <input className={inputCls} value={form.coverAlt} onChange={(e) => set('coverAlt', e.target.value)} placeholder="Describe the image for accessibility and SEO" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <label className={labelCls}>Author</label>
              <input className={inputCls} value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="e.g. HUSHAE team" />
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <label className={labelCls}>Tags (comma separated)</label>
              <input className={inputCls} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="fit guide, fabric, care" />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <label className={labelCls}>Status</label>
            <div className="grid gap-2">
              {STATUSES.map((s) => (
                <label key={s.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${form.status === s.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                  <input type="radio" name="status" checked={form.status === s.id} onChange={() => set('status', s.id)} className="mt-0.5 accent-neutral-900" />
                  <span>
                    <span className="block text-[13px] font-semibold text-neutral-900">{s.label}</span>
                    <span className="block text-[12px] text-neutral-500">{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {form.status === 'scheduled' && (
              <div className="mt-3">
                <label className={labelCls}>Publish date & time</label>
                <input type="datetime-local" className={inputCls} value={form.publishAt} onChange={(e) => set('publishAt', e.target.value)} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <label className={labelCls}>SEO</label>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Meta title</label>
                <input className={inputCls} value={form.seo.title} onChange={(e) => setSeo('title', e.target.value)} placeholder={form.title || 'Article title'} />
              </div>
              <div>
                <label className={labelCls}>Meta description</label>
                <textarea className={`${inputCls} min-h-16 resize-y`} value={form.seo.description} onChange={(e) => setSeo('description', e.target.value)} placeholder={form.excerpt || 'Short summary for Google'} />
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium text-neutral-700">
                <input type="checkbox" checked={form.seo.noIndex} onChange={(e) => setSeo('noIndex', e.target.checked)} className="accent-neutral-900" />
                Hide from search engines (noindex)
              </label>
            </div>
          </div>
        </div>

        {/* ---- Right: markdown editor + live preview ---- */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 flex items-center justify-between">
              <label className={labelCls}>Article body (Markdown)</label>
              <span className="text-[11px] text-neutral-400"># heading · **bold** · *italic* · [link](url) · ![alt](url) · - list · 1. list · &gt; quote · ---</span>
            </div>
            <textarea
              className="min-h-[420px] w-full resize-y rounded-xl border border-neutral-300 bg-neutral-50 p-3 font-mono text-[13px] leading-relaxed outline-none transition focus:border-neutral-900"
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              placeholder={'# Your headline\n\nWrite your article here. A line starting with # is a heading, **two stars** make text bold, and a line starting with - makes a bullet.\n\n- first point\n- second point\n\n> A pull-quote looks like this.\n\n![alt text](https://example.com/image.jpg)'}
            />
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className={labelCls}>Live preview</p>
            <div className="prose max-w-none">
              <BlogMarkdown text={form.content || '*Nothing to preview yet.*'} headingLevel={2} />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
