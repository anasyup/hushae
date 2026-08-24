import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import MediaPicker from '../components/MediaPicker';
import BlogMarkdown from '../components/BlogMarkdown';
import { btnGhost, btnSolid, ctl, TableSkeleton } from './orders/orderUi';

const STATUSES = [
  { id: 'draft', label: 'Draft', hint: 'Hidden — visible only to you' },
  { id: 'published', label: 'Published', hint: 'Live on /blog now' },
  { id: 'scheduled', label: 'Scheduled', hint: 'Goes live at the date below' },
  { id: 'archived', label: 'Archived', hint: 'Hidden from the site' },
];

const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function BlogEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { auth, toast } = useApp();
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
        <PageHeader title="Article" />
        <TableSkeleton rows={8} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isNew ? 'New article' : 'Edit article'}>
      <PageHeader
        title={isNew ? 'New article' : 'Edit article'}
        description="Title, body, publishing and SEO."
        actions={(
          <>
            <Link to="/admin/blog" className={btnGhost}>All articles</Link>
            {previewUrl && <a href={previewUrl} target="_blank" rel="noopener noreferrer" className={btnGhost}>Preview</a>}
            <button type="button" onClick={save} disabled={saving} className={btnSolid}>
              <Save size={12} /> {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
            </button>
          </>
        )}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <section className="mb-10">
            <p className="adm-index">01 — Article</p>
            <div className="space-y-4 border-y border-[#EAEAEA] py-6">
              <div>
                <label className="adm-label mb-1.5 block">Title *</label>
                <input className={ctl} value={form.title} onChange={(e) => onTitle(e.target.value)} placeholder="How to find your perfect bra size" />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#AAAAAA]">/blog/</span>
                  <input
                    className={ctl}
                    value={form.slug}
                    onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}
                    placeholder="how-to-find-your-perfect-bra-size"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#AAAAAA]">Auto-filled from the title. Lowercase letters, numbers, dashes.</p>
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Excerpt</label>
                <textarea className={`${ctl} min-h-20 py-2`} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} placeholder="One or two lines shown on the /blog list." />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Cover image</label>
                <MediaPicker value={form.coverImage} onChange={(url) => set('coverImage', url)} />
                <div className="mt-3">
                  <label className="adm-label mb-1.5 block">Cover alt text</label>
                  <input className={ctl} value={form.coverAlt} onChange={(e) => set('coverAlt', e.target.value)} placeholder="Describe the image for accessibility and SEO" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="adm-label mb-1.5 block">Author</label>
                  <input className={ctl} value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="e.g. HUSHAE team" />
                </div>
                <div>
                  <label className="adm-label mb-1.5 block">Tags (comma separated)</label>
                  <input className={ctl} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="fit guide, fabric, care" />
                </div>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <p className="adm-index">02 — Publishing</p>
            <div className="space-y-2 border-y border-[#EAEAEA] py-4">
              {STATUSES.map((s) => (
                <label key={s.id} className={`flex cursor-pointer items-start gap-3 border-b border-[#F0F0F0] py-3 last:border-0 ${form.status === s.id ? '' : 'opacity-60'}`}>
                  <input type="radio" name="status" checked={form.status === s.id} onChange={() => set('status', s.id)} className="mt-1 accent-white" />
                  <span>
                    <span className="block text-[13px] text-white">{s.label}</span>
                    <span className="block text-[12px] text-[#AAAAAA]">{s.hint}</span>
                  </span>
                </label>
              ))}
              {form.status === 'scheduled' && (
                <div className="pt-2">
                  <label className="adm-label mb-1.5 block">Publish date & time</label>
                  <input type="datetime-local" className={`${ctl} [color-scheme:dark]`} value={form.publishAt} onChange={(e) => set('publishAt', e.target.value)} />
                </div>
              )}
            </div>
          </section>

          <section>
            <p className="adm-index">03 — Seo</p>
            <div className="space-y-4 border-y border-[#EAEAEA] py-6">
              <div>
                <label className="adm-label mb-1.5 block">Meta title</label>
                <input className={ctl} value={form.seo.title} onChange={(e) => setSeo('title', e.target.value)} placeholder={form.title || 'Article title'} />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Meta description</label>
                <textarea className={`${ctl} min-h-16 py-2`} value={form.seo.description} onChange={(e) => setSeo('description', e.target.value)} placeholder={form.excerpt || 'Short summary for Google'} />
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[#555555]">
                <input type="checkbox" checked={form.seo.noIndex} onChange={(e) => setSeo('noIndex', e.target.checked)} className="accent-white" />
                Hide from search engines (noindex)
              </label>
            </div>
          </section>
        </div>

        <div>
          <section className="mb-10">
            <p className="adm-index">04 — Content</p>
            <p className="mb-3 text-[11px] text-[#AAAAAA]"># heading · **bold** · *italic* · [link](url)</p>
            <textarea
              className={`${ctl} min-h-[420px] py-3 font-mono leading-relaxed`}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              placeholder={'# Your headline\n\nWrite your article here.'}
            />
          </section>
          <section>
            <p className="adm-index">05 — Preview</p>
            <div className="prose prose-invert max-w-none border-y border-[#EAEAEA] py-6 text-[#333333]">
              <BlogMarkdown text={form.content || '*Nothing to preview yet.*'} headingLevel={2} />
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
