import { useEffect, useState } from 'react';
import { Moon, Save, Sun } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { getAdminTheme, setAdminTheme } from '../lib/adminTheme';

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-line px-4 py-3.5 text-sm">
    <b>{label}</b>
    <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-sagedeep' : 'bg-line'}`} onClick={(e) => { e.preventDefault(); onChange(!checked); }}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </span>
  </label>
);

export default function SettingsAdmin() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState(getAdminTheme());

  useEffect(() => { api('/settings').then((d) => setS(d.settings)).catch(() => {}); }, []);
  if (!s) return <AdminLayout title="Store Settings"><div className="skeleton h-96 w-full" /></AdminLayout>;

  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const setHero = (k, v) => set('hero', { ...s.hero, [k]: v });
  const setOffer = (k, v) => set('offerBar', { enabled: true, messageEn: '', messageUr: '', ctaEn: '', ctaUr: '', link: '/sale', ...(s.offerBar || {}), [k]: v });
  const setBadge = (i, k, v) => set('trustBadges', s.trustBadges.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  const setPM = (k, v) => set('paymentMethods', { ...s.paymentMethods, [k]: v });

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        storeName: s.storeName, tagline: s.tagline, contactEmail: s.contactEmail, contactPhone: s.contactPhone,
        hero: s.hero, trustBadges: s.trustBadges, shippingFlatRate: Number(s.shippingFlatRate),
        freeShippingThreshold: Number(s.freeShippingThreshold), paymentMethods: s.paymentMethods, theme: s.theme,
        offerBar: s.offerBar,
      };
      await api('/settings', { method: 'PUT', token: auth.token, body });
      toast('Settings saved');
    } catch (ex) { toast(ex.message); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Store Settings">
      {/* Appearance — admin panel theme (this device only) */}
      <div className="card mb-6 p-6">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ash">Appearance — admin panel</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-sm text-ash">Admin panel ka theme — white ya black. Sirf aapke is device par apply hota hai, store par koi asar nahi.</p>
          <button
            onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); setAdminTheme(t); toast(t === 'dark' ? 'Dark mode ON 🌙' : 'Light mode ON ☀️'); }}
            className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${theme === 'dark' ? 'bg-obsidian/85 text-alabaster ring-1 ring-alabaster/20' : 'bg-obsidian text-alabaster'}`}>
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />} {theme === 'dark' ? 'Dark — ON' : 'Light — ON'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-5 p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Store</p>
          <div><label className="label">Store name</label><input className="input" value={s.storeName} onChange={(e) => set('storeName', e.target.value)} /></div>
          <div><label className="label">Tagline</label><input className="input" value={s.tagline} onChange={(e) => set('tagline', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Contact email</label><input className="input" value={s.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></div>
            <div><label className="label">Contact phone</label><input className="input" value={s.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></div>
          </div>
        </div>

        <div className="card space-y-5 p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Homepage hero</p>
          <div><label className="label">Title</label><textarea className="input min-h-16" value={s.hero.title} onChange={(e) => setHero('title', e.target.value)} /></div>
          <div><label className="label">Subtitle</label><textarea className="input min-h-16" value={s.hero.subtitle} onChange={(e) => setHero('subtitle', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Women CTA</label><input className="input" value={s.hero.ctaWomen} onChange={(e) => setHero('ctaWomen', e.target.value)} /></div>
            <div><label className="label">Men CTA</label><input className="input" value={s.hero.ctaMen} onChange={(e) => setHero('ctaMen', e.target.value)} /></div>
          </div>
          <div><label className="label">Hero image URL</label><input className="input font-mono text-xs" value={s.hero.image} onChange={(e) => setHero('image', e.target.value)} /></div>
        </div>

        <div className="card space-y-5 p-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Sale &amp; offer bar</p>
            <span className="rounded-full bg-sage/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sagedeep">Shows above header</span>
          </div>
          <Toggle label="Offer bar enabled" checked={!!s.offerBar?.enabled} onChange={(v) => setOffer('enabled', v)} />
          <div><label className="label">Message (English)</label><input className="input" value={s.offerBar?.messageEn || ''} onChange={(e) => setOffer('messageEn', e.target.value)} placeholder="Season Sale — up to 40% off · while stock lasts" /></div>
          <div><label className="label">Message (اردو)</label><input className="input font-urdu" value={s.offerBar?.messageUr || ''} onChange={(e) => setOffer('messageUr', e.target.value)} placeholder="سیزن سیل — ۴۰٪ تک رعایت" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Button (English)</label><input className="input" value={s.offerBar?.ctaEn || ''} onChange={(e) => setOffer('ctaEn', e.target.value)} placeholder="Shop the Sale" /></div>
            <div><label className="label">Button (اردو)</label><input className="input font-urdu" value={s.offerBar?.ctaUr || ''} onChange={(e) => setOffer('ctaUr', e.target.value)} placeholder="سیل دیکھیں" /></div>
          </div>
          <div><label className="label">Button link</label><input className="input font-mono text-xs" value={s.offerBar?.link || ''} onChange={(e) => setOffer('link', e.target.value)} placeholder="/sale" /></div>
          <p className="text-[11px] leading-relaxed text-ash">
            Tip: kisi bhi product ko sale pe lane ke liye Products → Edit mein <b>Compare-at price</b> set karein — wo /sale page pe discount % ke saath nazar ayega.
          </p>
        </div>

        <div className="card space-y-4 p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Trust badges</p>
          {s.trustBadges.map((b, i) => (
            <div key={i} className="grid grid-cols-[140px_1fr] items-center gap-3">
              <input className="input !py-2.5 !text-xs font-semibold" value={b.title} onChange={(e) => setBadge(i, 'title', e.target.value)} />
              <input className="input !py-2.5 !text-xs" value={b.text} onChange={(e) => setBadge(i, 'text', e.target.value)} />
            </div>
          ))}
        </div>

        <div className="card space-y-5 p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Shipping & payments</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Flat rate (PKR)</label><input className="input" type="number" min="0" value={s.shippingFlatRate} onChange={(e) => set('shippingFlatRate', e.target.value)} /></div>
            <div><label className="label">Free shipping over (PKR)</label><input className="input" type="number" min="0" value={s.freeShippingThreshold} onChange={(e) => set('freeShippingThreshold', e.target.value)} /></div>
          </div>
          <div className="grid gap-2.5">
            <Toggle label="Cash on Delivery" checked={s.paymentMethods.cod} onChange={(v) => setPM('cod', v)} />
            <Toggle label="JazzCash" checked={s.paymentMethods.jazzcash} onChange={(v) => setPM('jazzcash', v)} />
            <Toggle label="EasyPaisa" checked={s.paymentMethods.easypaisa} onChange={(v) => setPM('easypaisa', v)} />
            <Toggle label="Bank Transfer" checked={s.paymentMethods.bank} onChange={(v) => setPM('bank', v)} />
          </div>
          <div><label className="label">Bank details (shown at checkout)</label><textarea className="input min-h-20 font-mono text-xs" value={s.paymentMethods.bankDetails} onChange={(e) => setPM('bankDetails', e.target.value)} /></div>
        </div>
      </div>

      <button onClick={save} disabled={busy} className="btn-primary mt-8"><Save size={15} /> {busy ? 'Saving…' : 'Save all settings'}</button>
    </AdminLayout>
  );
}
