import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdToggle, EdText, EdNum,
  TableSkeleton, EditorialError, ctl, ta, btnSolid,
  passwordStrength, StrengthBar,
} from './settings/chrome';

export default function SettingsAdmin() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings').then((d) => setS(d.settings)).catch(() => setErr('Could not load settings'));
  }, []);

  if (!s && !err) {
    return (
      <AdminLayout title="Advanced">
        <PageHeader title="Advanced" description="Analytics preferences and the original store settings document." />
        <TableSkeleton rows={8} />
      </AdminLayout>
    );
  }

  if (err || !s) {
    return (
      <AdminLayout title="Advanced">
        <PageHeader title="Advanced" description="Analytics preferences and the original store settings document." />
        <EditorialError title="Unable to load settings" description={err} onRetry={() => { setErr(''); api('/settings').then((d) => setS(d.settings)).catch(() => setErr('Could not load settings')); }} />
      </AdminLayout>
    );
  }

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
        includeTestOrders: !!s.includeTestOrders,
        reorderTargetStock: Number(s.reorderTargetStock) || 50,
      };
      await api('/settings', { method: 'PUT', token: auth.token, body });
      toast('Settings saved');
    } catch (ex) { toast(ex.message); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Advanced">
      <PageHeader
        title="Advanced"
        description="Analytics preferences, the original store document, and password change."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Advanced' }]}
        actions={<button type="button" onClick={save} disabled={busy} className={btnSolid}>{busy ? 'Saving…' : 'Save all settings'}</button>}
      />

      <EdSection index={1} title="Analytics">
        <EdToggle
          label="Include test orders in analytics"
          description="Revenue, orders, AOV and top customers."
          checked={!!s.includeTestOrders}
          onChange={(v) => set('includeTestOrders', v)}
        />
        <div className="mt-4 max-w-xs">
          <EdNum label="Reorder target stock level" value={s.reorderTargetStock ?? 50} onChange={(v) => set('reorderTargetStock', Number(v))} min="1" />
        </div>
      </EdSection>

      <EdSection index={2} title="Store">
        <div className="grid gap-4 md:grid-cols-2">
          <EdText label="Store name" value={s.storeName} onChange={(v) => set('storeName', v)} />
          <EdText label="Tagline" value={s.tagline} onChange={(v) => set('tagline', v)} />
          <EdText label="Contact email" value={s.contactEmail} onChange={(v) => set('contactEmail', v)} />
          <EdText label="Contact phone" value={s.contactPhone} onChange={(v) => set('contactPhone', v)} />
        </div>
      </EdSection>

      <EdSection index={3} title="Homepage hero">
        <div className="space-y-4">
          <div>
            <label className="adm-label mb-1.5 block">Title</label>
            <textarea className={ta} value={s.hero.title} onChange={(e) => setHero('title', e.target.value)} />
          </div>
          <div>
            <label className="adm-label mb-1.5 block">Subtitle</label>
            <textarea className={ta} value={s.hero.subtitle} onChange={(e) => setHero('subtitle', e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <EdText label="Women CTA" value={s.hero.ctaWomen} onChange={(v) => setHero('ctaWomen', v)} />
            <EdText label="Men CTA" value={s.hero.ctaMen} onChange={(v) => setHero('ctaMen', v)} />
          </div>
          <EdText label="Hero image URL" value={s.hero.image} onChange={(v) => setHero('image', v)} />
        </div>
      </EdSection>

      <EdSection index={4} title="Sale & offer bar" description="Shows above the header.">
        <EdToggle label="Offer bar enabled" checked={!!s.offerBar?.enabled} onChange={(v) => setOffer('enabled', v)} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdText label="Message" value={s.offerBar?.messageEn || ''} onChange={(v) => setOffer('messageEn', v)} placeholder="Season Sale — up to 40% off · while stock lasts" />
          <EdText label="Button label" value={s.offerBar?.ctaEn || ''} onChange={(v) => setOffer('ctaEn', v)} placeholder="Shop the Sale" />
          <EdText label="Button link" value={s.offerBar?.link || ''} onChange={(v) => setOffer('link', v)} placeholder="/sale" />
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-[#AAAAAA]">
          To put any product on sale, open Products → Edit and set a compare-at price. It will appear on the /sale page with the discount %.
        </p>
      </EdSection>

      <EdSection index={5} title="Trust badges">
        <div className="space-y-3">
          {s.trustBadges.map((b, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[160px_1fr]">
              <input className={ctl} value={b.title} onChange={(e) => setBadge(i, 'title', e.target.value)} />
              <input className={ctl} value={b.text} onChange={(e) => setBadge(i, 'text', e.target.value)} />
            </div>
          ))}
        </div>
      </EdSection>

      <EdSection index={6} title="Shipping & payments">
        <div className="grid gap-4 md:grid-cols-2">
          <EdNum label="Flat rate (PKR)" value={s.shippingFlatRate} onChange={(v) => set('shippingFlatRate', v)} min="0" />
          <EdNum label="Free shipping over (PKR)" value={s.freeShippingThreshold} onChange={(v) => set('freeShippingThreshold', v)} min="0" />
        </div>
        <div className="mt-4">
          <EdToggle label="Cash on Delivery" checked={s.paymentMethods.cod} onChange={(v) => setPM('cod', v)} />
          <EdToggle label="JazzCash" checked={s.paymentMethods.jazzcash} onChange={(v) => setPM('jazzcash', v)} />
          <EdToggle label="EasyPaisa" checked={s.paymentMethods.easypaisa} onChange={(v) => setPM('easypaisa', v)} />
          <EdToggle label="Bank Transfer" checked={s.paymentMethods.bank} onChange={(v) => setPM('bank', v)} />
        </div>
        <div className="mt-4">
          <label className="adm-label mb-1.5 block">Bank details (shown at checkout)</label>
          <textarea className={ta} value={s.paymentMethods.bankDetails} onChange={(e) => setPM('bankDetails', e.target.value)} />
        </div>
      </EdSection>

      <ChangePasswordCard />
    </AdminLayout>
  );
}

function ChangePasswordCard() {
  const { auth, setAuth, toast } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ c: false, n: false, x: false });
  const [busy, setBusy] = useState(false);
  const strength = passwordStrength(next);

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
      if (res?.token && setAuth) setAuth({ token: res.token, user: res.user });
      toast('Password changed successfully');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (ex) {
      toast(ex?.message || 'Could not change password');
    }
    setBusy(false);
  };

  const eye = (which) => (
    <button type="button" onClick={() => setShow((s) => ({ ...s, [which]: !s[which] }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-black" aria-label="Toggle visibility">
      {show[which] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <form onSubmit={submit}>
      <EdSection index={7} title="Change password" description="At least 8 characters, letters and numbers. Other devices are signed out after change.">
        <div className="relative mb-4">
          <label className="adm-label mb-1.5 block">Current password</label>
          <input className={`${ctl} pr-10`} type={show.c ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          {eye('c')}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <label className="adm-label mb-1.5 block">New password</label>
            <input className={`${ctl} pr-10`} type={show.n ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="Min 8 chars, letters + numbers" />
            {eye('n')}
            <StrengthBar pct={strength.pct} label={strength.label} />
          </div>
          <div className="relative">
            <label className="adm-label mb-1.5 block">Confirm new password</label>
            <input className={`${ctl} pr-10`} type={show.x ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            {eye('x')}
            {confirm && next && confirm !== next && <p className="mt-1 text-[12px] text-[#999999]">Passwords do not match</p>}
          </div>
        </div>
        <button type="submit" disabled={busy || !current || !next || next !== confirm} className={`${btnSolid} mt-6`}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </EdSection>
    </form>
  );
}
