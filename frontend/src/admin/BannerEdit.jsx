import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, Save } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import MediaPicker from '../components/MediaPicker';

/* ============================================================================
 * ADMIN → BANNERS → EDIT — create / edit a banner.
 * Tabs: Content · Assignment · Schedule · (Analytics read-only when editing).
 * ========================================================================== */

const inputCls = 'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-neutral-900';
const labelCls = 'mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500';

export default function BannerEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { auth, toast } = useApp();
  const isNew = id === 'new' || !id;

  const [slots, setSlots] = useState([]);
  const [tab, setTab] = useState('content');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState({
    name: '', slot: '', type: 'image', mediaUrl: '', html: '',
    heading: '', subtitle: '', ctaText: '', ctaLink: '',
    textPosition: 'left', textColor: '#FFFFFF', overlayOpacity: 40,
    priority: 5, status: 'draft', startAt: '', endAt: '', alwaysActive: true, device: 'all',
    impressions: 0, clicks: 0,
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    api('/banners/admin/slots', { token: auth?.token }).then((d) => setSlots(d.slots || [])).catch(() => {});
  }, [auth?.token]);

  useEffect(() => {
    if (isNew) { setLoaded(true); return; }
    let alive = true;
    api(`/banners/admin/${id}`, { token: auth?.token })
      .then((d) => {
        if (!alive) return;
        const b = d.banner || {};
        setF({
          name: b.name || '', slot: b.slot || '', type: b.type || 'image', mediaUrl: b.mediaUrl || '', html: b.html || '',
          heading: b.heading || '', subtitle: b.subtitle || '', ctaText: b.ctaText || '', ctaLink: b.ctaLink || '',
          textPosition: b.textPosition || 'left', textColor: b.textColor || '#FFFFFF', overlayOpacity: b.overlayOpacity ?? 40,
          priority: b.priority || 5, status: b.status || 'draft',
          startAt: b.startAt ? new Date(b.startAt).toISOString().slice(0, 16) : '',
          endAt: b.endAt ? new Date(b.endAt).toISOString().slice(0, 16) : '',
          alwaysActive: !!b.alwaysActive, device: b.device || 'all',
          impressions: b.impressions || 0, clicks: b.clicks || 0,
        });
        setLoaded(true);
      })
      .catch(() => { toast('Could not load banner'); nav('/admin/banners'); });
    return () => { alive = false; };
  }, [id, isNew, auth?.token, toast, nav]);

  const ctr = useMemo(() => (f.impressions > 0 ? ((f.clicks / f.impressions) * 100).toFixed(1) : '0.0'), [f.impressions, f.clicks]);

  const save = async () => {
    if (!f.name.trim()) { toast('Banner name is required'); return; }
    if (!f.slot) { toast('Choose a slot'); return; }
    setSaving(true);
    const body = {
      ...f,
      startAt: f.startAt ? new Date(f.startAt).toISOString() : null,
      endAt: f.endAt ? new Date(f.endAt).toISOString() : null,
    };
    try {
      if (isNew) await api('/banners/admin', { method: 'POST', token: auth?.token, body });
      else await api(`/banners/admin/${id}`, { method: 'PUT', token: auth?.token, body });
      toast('Banner saved');
      nav('/admin/banners');
    } catch (ex) { toast(ex.message || 'Could not save'); }
    setSaving(false);
  };

  const preview = useMemo(() => (
    <div className="relative aspect-[16/7] overflow-hidden rounded-xl bg-neutral-900">
      {f.mediaUrl && <img src={f.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${Math.min(90, Math.max(0, Number(f.overlayOpacity) || 40)) / 100})` }} />
      <div className={`relative flex h-full flex-col justify-center px-6 ${f.textPosition === 'center' ? 'items-center text-center' : f.textPosition === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
        {f.heading && <p className="text-2xl font-bold uppercase tracking-[0.04em]" style={{ color: f.textColor }}>{f.heading}</p>}
        {f.subtitle && <p className="mt-1 text-[12px] uppercase tracking-[0.14em] opacity-90" style={{ color: f.textColor }}>{f.subtitle}</p>}
        {f.ctaText && <span className="mt-3 inline-flex w-fit bg-white px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-black">{f.ctaText}</span>}
      </div>
    </div>
  ), [f]);

  if (!loaded) {
    return <AdminLayout title="Banner editor"><div className="h-96 animate-pulse bg-[#FAFAFA]" /></AdminLayout>;
  }

  return (
    <AdminLayout title={isNew ? 'New banner' : 'Edit banner'}>
      <PageHeader
        title={isNew ? 'New banner' : (f.name || 'Edit banner')}
        description="Content, assignment and schedule."
        actions={(
          <>
            <Link to="/admin/banners" className={btnGhost}><ArrowLeft size={12} /> Back</Link>
            <button type="button" onClick={save} disabled={saving} className={btnSolid}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {isNew ? 'Create banner' : 'Save changes'}
            </button>
          </>
        )}
      />

      <div className="mb-8 flex gap-5 border-b border-[#EAEAEA]">
        {[['content', 'Content'], ['assignment', 'Assignment'], ['schedule', 'Schedule'], ['analytics', 'Analytics']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`-mb-px border-b py-2.5 text-[10px] font-medium uppercase tracking-[0.16em] ${tab === k ? 'border-white text-black' : 'border-transparent text-[#AAAAAA] hover:text-[#555555]'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {tab === 'content' && (
            <>
              <div className="border-y border-[#EAEAEA] py-6">
                <label className={labelCls}>Banner name *</label>
                <input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Winter Sale — Homepage" />
              </div>
              <div className="border-y border-[#EAEAEA] py-6">
                <label className={labelCls}>Type</label>
                <div className="flex gap-2">
                  {['image', 'video', 'html'].map((t) => (
                    <button key={t} onClick={() => set('type', t)}
                      className={`px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] ${f.type === t ? 'bg-white text-black' : 'border border-[#DCDCDC] text-[#777777]'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                {f.type === 'image' && (
                  <div className="mt-4">
                    <label className={labelCls}>Image</label>
                    <MediaPicker value={f.mediaUrl} onChange={(url) => set('mediaUrl', url)} />
                    <p className="mt-1.5 text-[11px] text-[#AAAAAA]">Recommended {f.slot ? (slots.find((s) => s._id === f.slot)?.width || 1920) + '×' + (slots.find((s) => s._id === f.slot)?.height || 800) : '1920×800'}.</p>
                  </div>
                )}
                {f.type === 'video' && (
                  <div className="mt-4"><label className={labelCls}>Video URL</label><input className={inputCls} value={f.mediaUrl} onChange={(e) => set('mediaUrl', e.target.value)} placeholder="mp4 or YouTube URL" /></div>
                )}
                {f.type === 'html' && (
                  <div className="mt-4"><label className={labelCls}>HTML</label><textarea className={`${inputCls} min-h-28 font-mono`} value={f.html} onChange={(e) => set('html', e.target.value)} placeholder="<div>…</div>" /></div>
                )}
              </div>
              <div className="border-y border-[#EAEAEA] py-6">
                <label className={labelCls}>Overlay text</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className={labelCls}>Heading</label><input className={inputCls} value={f.heading} onChange={(e) => set('heading', e.target.value)} placeholder="Winter Sale" /></div>
                  <div><label className={labelCls}>Subtitle</label><input className={inputCls} value={f.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Up to 30% off signature pieces" /></div>
                  <div><label className={labelCls}>CTA text</label><input className={inputCls} value={f.ctaText} onChange={(e) => set('ctaText', e.target.value)} placeholder="Shop the sale" /></div>
                  <div><label className={labelCls}>CTA link</label><input className={inputCls} value={f.ctaLink} onChange={(e) => set('ctaLink', e.target.value)} placeholder="/sale or https://…" /></div>
                  <div>
                    <label className={labelCls}>Text position</label>
                    <select className={inputCls} value={f.textPosition} onChange={(e) => set('textPosition', e.target.value)}>
                      <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Text colour</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="h-8 w-10 cursor-pointer border border-[#DCDCDC] bg-transparent" value={f.textColor} onChange={(e) => set('textColor', e.target.value)} />
                      <input className={inputCls} value={f.textColor} onChange={(e) => set('textColor', e.target.value)} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Overlay opacity — {f.overlayOpacity}%</label>
                    <input type="range" min="0" max="100" value={f.overlayOpacity} onChange={(e) => set('overlayOpacity', Number(e.target.value))} className="w-full accent-neutral-900" />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'assignment' && (
            <div className="border-y border-[#EAEAEA] py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Slot *</label>
                  <select className={inputCls} value={f.slot} onChange={(e) => set('slot', e.target.value)}>
                    <option value="">Choose a slot…</option>
                    {slots.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.key})</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority (1–10)</label>
                  <input type="number" min="1" max="10" className={inputCls} value={f.priority} onChange={(e) => set('priority', Number(e.target.value) || 5)} />
                  <p className="mt-1 text-[11px] text-[#AAAAAA]">Higher shows first when multiple banners share a slot.</p>
                </div>
                <div>
                  <label className={labelCls}>Device targeting</label>
                  <select className={inputCls} value={f.device} onChange={(e) => set('device', e.target.value)}>
                    <option value="all">All devices</option><option value="desktop">Desktop only</option><option value="mobile">Mobile only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === 'schedule' && (
            <div className="border-y border-[#EAEAEA] py-6">
              <label className="mb-4 flex cursor-pointer items-center gap-3 border border-[#EAEAEA] px-4 py-3">
                <input type="checkbox" checked={f.alwaysActive} onChange={(e) => set('alwaysActive', e.target.checked)} className="h-4 w-4 accent-neutral-900" />
                <span className="text-[13px] text-[#333333]">Always active (no start/end)</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Start</label>
                  <input type="datetime-local" className={inputCls} value={f.startAt} onChange={(e) => set('startAt', e.target.value)} disabled={f.alwaysActive} />
                </div>
                <div>
                  <label className={labelCls}>End</label>
                  <input type="datetime-local" className={inputCls} value={f.endAt} onChange={(e) => set('endAt', e.target.value)} disabled={f.alwaysActive} />
                </div>
              </div>
              <div className="mt-4">
                <label className={labelCls}>Status</label>
                <div className="flex gap-2">
                  {['draft', 'active', 'archived'].map((st) => (
                    <button key={st} onClick={() => set('status', st)}
                      className={`px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] ${f.status === st ? 'bg-white text-black' : 'border border-[#DCDCDC] text-[#777777]'}`}>
                      {st}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-[#AAAAAA]">Draft = hidden. Active = eligible to show (respects schedule + device). Archived = hidden.</p>
              </div>
            </div>
          )}

          {tab === 'analytics' && (
            <div className="border-y border-[#EAEAEA] py-6">
              {isNew ? (
                <p className="py-8 text-center text-[13px] text-[#AAAAAA]">Analytics appear after the banner has been live. Save it first.</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {[['Impressions', f.impressions?.toLocaleString()], ['Clicks', f.clicks?.toLocaleString()], ['CTR', `${ctr}%`]].map(([l, v]) => (
                    <div key={l} className="border-y border-[#EAEAEA] py-4 text-center">
                      <p className="adm-metric text-[22px] text-black">{v}</p>
                      <p className="adm-label mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <p className="adm-label flex items-center gap-1.5"><Eye size={13} /> Live preview</p>
          {preview}
          <p className="text-[11px] text-[#AAAAAA]">Text position, colour and overlay opacity are reflected here.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
