import { useEffect, useState } from 'react';
import { Moon, Save, Sun, Lock, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { getAdminTheme, setAdminTheme } from '../lib/adminTheme';

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3.5 text-sm">
    <b>{label}</b>
    <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-emerald-600' : 'bg-neutral-300'}`} onClick={(e) => { e.preventDefault(); onChange(!checked); }}>
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
  if (!s) return <AdminLayout title="Store Settings"><div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" /></AdminLayout>;

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
      <div className="rounded-2xl border border-neutral-200 bg-white mb-6 p-6">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500">Appearance — admin panel</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-sm text-neutral-500">Admin panel ka theme — white ya black. Sirf aapke is device par apply hota hai, store par koi asar nahi.</p>
          <button
            onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); setAdminTheme(t); toast(t === 'dark' ? 'Dark mode ON 🌙' : 'Light mode ON ☀️'); }}
            className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${theme === 'dark' ? 'bg-neutral-900/85 text-white ring-1 ring-alabaster/20' : 'bg-neutral-900 text-white'}`}>
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />} {theme === 'dark' ? 'Dark — ON' : 'Light — ON'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white space-y-5 p-6">
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Store</p>
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Store name</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" value={s.storeName} onChange={(e) => set('storeName', e.target.value)} /></div>
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Tagline</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" value={s.tagline} onChange={(e) => set('tagline', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Contact email</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" value={s.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></div>
            <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Contact phone</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" value={s.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white space-y-5 p-6">
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Homepage hero</p>
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Title</label><textarea className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[9px] outline-none transition focus:border-neutral-900 min-h-16" value={s.hero.title} onChange={(e) => setHero('title', e.target.value)} /></div>
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Subtitle</label><textarea className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[9px] outline-none transition focus:border-neutral-900 min-h-16" value={s.hero.subtitle} onChange={(e) => setHero('subtitle', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Women CTA</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" value={s.hero.ctaWomen} onChange={(e) => setHero('ctaWomen', e.target.value)} /></div>
            <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Men CTA</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" value={s.hero.ctaMen} onChange={(e) => setHero('ctaMen', e.target.value)} /></div>
          </div>
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Hero image URL</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[9px] outline-none transition focus:border-neutral-900 font-mono text-xs" value={s.hero.image} onChange={(e) => setHero('image', e.target.value)} /></div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white space-y-5 p-6">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Sale &amp; offer bar</p>
            <span className="rounded-full bg-emerald-20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Shows above header</span>
          </div>
          <Toggle label="Offer bar enabled" checked={!!s.offerBar?.enabled} onChange={(v) => setOffer('enabled', v)} />
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Message</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" value={s.offerBar?.messageEn || ''} onChange={(e) => setOffer('messageEn', e.target.value)} placeholder="Season Sale — up to 40% off · while stock lasts" /></div>
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Button label</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" value={s.offerBar?.ctaEn || ''} onChange={(e) => setOffer('ctaEn', e.target.value)} placeholder="Shop the Sale" /></div>
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Button link</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[9px] outline-none transition focus:border-neutral-900 font-mono text-xs" value={s.offerBar?.link || ''} onChange={(e) => setOffer('link', e.target.value)} placeholder="/sale" /></div>
          <p className="text-[9px] leading-relaxed text-neutral-500">
            Tip: to put any product on sale, open Products → Edit and set a <b>Compare-at price</b>. It will appear on the /sale page with the discount %.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white space-y-4 p-6">
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Trust badges</p>
          {s.trustBadges.map((b, i) => (
            <div key={i} className="grid grid-cols-[140px_1fr] items-center gap-3">
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[9px] outline-none transition focus:border-neutral-900 !py-2.5 !text-xs font-semibold" value={b.title} onChange={(e) => setBadge(i, 'title', e.target.value)} />
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[9px] outline-none transition focus:border-neutral-900 !py-2.5 !text-xs" value={b.text} onChange={(e) => setBadge(i, 'text', e.target.value)} />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white space-y-5 p-6">
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Shipping & payments</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Flat rate (PKR)</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" type="number" min="0" value={s.shippingFlatRate} onChange={(e) => set('shippingFlatRate', e.target.value)} /></div>
            <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Free shipping over (PKR)</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" type="number" min="0" value={s.freeShippingThreshold} onChange={(e) => set('freeShippingThreshold', e.target.value)} /></div>
          </div>
          <div className="grid gap-2.5">
            <Toggle label="Cash on Delivery" checked={s.paymentMethods.cod} onChange={(v) => setPM('cod', v)} />
            <Toggle label="JazzCash" checked={s.paymentMethods.jazzcash} onChange={(v) => setPM('jazzcash', v)} />
            <Toggle label="EasyPaisa" checked={s.paymentMethods.easypaisa} onChange={(v) => setPM('easypaisa', v)} />
            <Toggle label="Bank Transfer" checked={s.paymentMethods.bank} onChange={(v) => setPM('bank', v)} />
          </div>
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Bank details (shown at checkout)</label><textarea className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[9px] outline-none transition focus:border-neutral-900 min-h-20 font-mono text-xs" value={s.paymentMethods.bankDetails} onChange={(e) => setPM('bankDetails', e.target.value)} /></div>
        </div>
      </div>

      <ChangePasswordCard />

      <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[9px] font-semibold text-white hover:bg-black mt-8"><Save size={15} /> {busy ? 'Saving…' : 'Save all settings'}</button>
    </AdminLayout>
  );
}

/* ------------------------------------------------------------------ *
 * Change Password — admin can change own password from Settings.
 * Uses POST /api/auth/change-password. Requires current password.
 * On success: token rotates, so we update the auth store.
 * ------------------------------------------------------------------ */
function ChangePasswordCard() {
  const { auth, setAuth, toast } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ c: false, n: false, x: false });
  const [busy, setBusy] = useState(false);

  const strength = (() => {
    if (!next) return { label: '', color: 'transparent', pct: 0 };
    let score = 0;
    if (next.length >= 8) score++;
    if (next.length >= 12) score++;
    if (/[A-Z]/.test(next) && /[a-z]/.test(next)) score++;
    if (/[0-9]/.test(next)) score++;
    if (/[^A-Za-z0-9]/.test(next)) score++;
    const map = [
      { label: 'Very weak', color: '#dc2626', pct: 20 },
      { label: 'Weak', color: '#ea580c', pct: 40 },
      { label: 'Fair', color: '#ca8a04', pct: 60 },
      { label: 'Good', color: '#65a30d', pct: 80 },
      { label: 'Strong', color: '#16a34a', pct: 100 },
    ];
    return map[Math.min(score, 4)] || map[0];
  })();

  const submit = async (e) => {
    e.preventDefault();
    if (!current || !next) return toast('Fill both current and new password');
    if (next.length < 8) return toast('New password must be at least 8 characters');
    if (!/[a-zA-Z]/.test(next) || !/[0-9]/.test(next)) return toast('New password must include letters and numbers');
    if (next !== confirm) return toast('New password and confirm password do not match');
    if (next === current) return toast('New password must be different');

    setBusy(true);
    try {
      const res = await api('/auth/change-password', {
        method: 'POST',
        token: auth.token,
        body: { currentPassword: current, newPassword: next },
      });
      // Rotate token in the app store so subsequent calls use the new one
      if (res?.token && setAuth) {
        setAuth({ token: res.token, user: res.user });
      }
      toast('Password changed successfully');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (ex) {
      toast(ex?.message || 'Could not change password');
    }
    setBusy(false);
  };

  const eyeBtn = (which) => (
    <button
      type="button"
      onClick={() => setShow((s) => ({ ...s, [which]: !s[which] }))}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-500 hover:text-ink"
      aria-label="Toggle visibility"
    >
      {show[which] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <form onSubmit={submit} className="rounded-2xl border border-neutral-200 bg-white mt-6 space-y-5 p-6">
      <div className="flex items-center gap-2">
        <Lock size={16} className="text-emerald-700" />
        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Change password</p>
      </div>

      <div className="relative">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Current password</label>
        <input
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[9px] outline-none transition focus:border-neutral-900 pr-10"
          type={show.c ? 'text' : 'password'}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
        {eyeBtn('c')}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">New password</label>
          <input
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[9px] outline-none transition focus:border-neutral-900 pr-10"
            type={show.n ? 'text' : 'password'}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            placeholder="Min 8 chars, letters + numbers"
          />
          {eyeBtn('n')}
          {next && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-300">
                <div className="h-full transition-all" style={{ width: `${strength.pct}%`, background: strength.color }} />
              </div>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: strength.color }}>{strength.label}</p>
            </div>
          )}
        </div>

        <div className="relative">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Confirm new password</label>
          <input
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[9px] outline-none transition focus:border-neutral-900 pr-10"
            type={show.x ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {eyeBtn('x')}
          {confirm && next && confirm !== next && (
            <p className="mt-1 text-[9px] font-semibold text-red-600">Passwords do not match</p>
          )}
        </div>
      </div>

      <p className="text-[9px] leading-relaxed text-neutral-500">
        Kam se kam 8 characters, letters and numbers required. You will be logged out from other devices after change.
      </p>

      <button
        type="submit"
        disabled={busy || !current || !next || next !== confirm}
        className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[9px] font-semibold text-white hover:bg-black"
      >
        <Lock size={15} /> {busy ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
