import { useEffect, useState } from 'react';
import { ArrowRight, Megaphone } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

export default function Content() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/settings').then((d) => setS(d.settings)).catch(() => toast('Could not load settings')); }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="Content"><div className="skeleton h-64 w-full" /></AdminLayout>;

  const hero = s.hero || {};
  const offer = s.offerBar || {};
  const setHero = (k, v) => setS({ ...s, hero: { ...hero, [k]: v } });
  const setOffer = (k, v) => setS({ ...s, offerBar: { ...offer, [k]: v } });

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { hero: s.hero, offerBar: s.offerBar } });
      toast('Content saved — live par show ho raha hai');
    } catch (ex) { toast(ex.message || 'Could not save'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Content">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display text-lg">Homepage Hero</h2>
            <div className="mt-4 space-y-4">
              <div><label className="label">Title</label><textarea className="input min-h-16" value={hero.title || ''} onChange={(e) => setHero('title', e.target.value)} /></div>
              <div><label className="label">Subtitle</label><textarea className="input min-h-20" value={hero.subtitle || ''} onChange={(e) => setHero('subtitle', e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="label">Button 1 (Women)</label><input className="input" value={hero.ctaWomen || ''} onChange={(e) => setHero('ctaWomen', e.target.value)} /></div>
                <div><label className="label">Button 2 (Men)</label><input className="input" value={hero.ctaMen || ''} onChange={(e) => setHero('ctaMen', e.target.value)} /></div>
              </div>
              <div><label className="label">Hero image URL (optional)</label><input className="input" placeholder="https://…" value={hero.image || ''} onChange={(e) => setHero('image', e.target.value)} /></div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg">Announcement Bar (top strip)</h2>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-obsidian" checked={!!offer.enabled} onChange={(e) => setOffer('enabled', e.target.checked)} /> Announcement bar on hai
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><label className="label">Message (English)</label><input className="input" value={offer.messageEn || ''} onChange={(e) => setOffer('messageEn', e.target.value)} /></div>
              <div><label className="label">Message (Urdu)</label><input className="input" dir="rtl" value={offer.messageUr || ''} onChange={(e) => setOffer('messageUr', e.target.value)} /></div>
              <div><label className="label">Button text (EN)</label><input className="input" value={offer.ctaEn || ''} onChange={(e) => setOffer('ctaEn', e.target.value)} /></div>
              <div><label className="label">Link</label><input className="input" placeholder="/sale" value={offer.link || ''} onChange={(e) => setOffer('link', e.target.value)} /></div>
            </div>
          </div>
          <button onClick={save} disabled={busy} className="btn-primary w-full lg:w-auto">{busy ? 'Saving…' : 'Save All Changes'}</button>
        </div>

        {/* Live preview */}
        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <div className="card overflow-hidden">
            <p className="border-b border-line bg-satin/30 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-ash">Live Preview</p>
            {offer.enabled && (
              <div className="flex items-center justify-center gap-2 bg-obsidian px-4 py-2 text-center text-[11px] text-alabaster">
                <Megaphone size={12} className="shrink-0 opacity-70" />
                <span>{offer.messageEn}</span>
                <span className="font-semibold underline underline-offset-2">{offer.ctaEn}</span>
              </div>
            )}
            <div className="grid items-center gap-5 p-6 sm:grid-cols-2">
              <div>
                <p className="whitespace-pre-line font-display text-2xl leading-tight">{hero.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-ash">{hero.subtitle}</p>
                <div className="mt-4 flex gap-2">
                  <span className="btn-primary !px-3 !py-2 text-[11px]">{hero.ctaWomen} <ArrowRight size={11} /></span>
                  <span className="btn-outline !px-3 !py-2 text-[11px]">{hero.ctaMen}</span>
                </div>
              </div>
              {hero.image
                ? <img src={hero.image} alt="hero" className="h-44 w-full rounded-2xl object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                : <div className="flex h-44 items-center justify-center rounded-2xl bg-satin text-xs text-ash">Default hero image</div>}
            </div>
          </div>
          <p className="text-xs leading-relaxed text-ash">Preview sirf andaaze ke liye hai — Save karne ke baad asli website par foran apply ho jata hai.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
