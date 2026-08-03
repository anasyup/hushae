import { useEffect, useState } from 'react';
import { Facebook, HardDrive, Instagram, LineChart, Mail, MessageCircle, Music2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

const DEFAULTS = {
  whatsapp: { enabled: false, number: '', message: 'Hi! I have a question about HUSHAE.', adminAlertNumber: '', webhookUrl: '' },
  social: { instagram: '', facebook: '', tiktok: '' },
  analytics: { gaId: '', gtmId: '', clarityId: '', metaPixelId: '', tiktokPixelId: '' },
  email: { host: '', port: 587, secure: false, user: '', pass: '', from: '', adminAlert: '' },
  loyalty: { enabled: true, threshold: 2, discountPercent: 10, validDays: 60 },
};

export default function Apps() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/settings/admin', { token: auth.token }).then((d) => setS(d.settings)).catch(() => toast('Could not load settings')); }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="Apps"><div className="animate-pulse rounded-xl bg-neutral-100 h-64 w-full" /></AdminLayout>;

  const integ = s.integrations || {};
  const wa = { ...DEFAULTS.whatsapp, ...(integ.whatsapp || {}) };
  const social = { ...DEFAULTS.social, ...(integ.social || {}) };
  const analytics = { ...DEFAULTS.analytics, ...(integ.analytics || {}) };
  const email = { ...DEFAULTS.email, ...(integ.email || {}) };
  const loyalty = { ...DEFAULTS.loyalty, ...(integ.loyalty || {}) };
  const media = s.media || { cloudName: '', uploadPreset: '' };
  const setI = (patch) => setS({ ...s, integrations: { ...integ, ...patch } });
  const setWa = (k, v) => setI({ whatsapp: { ...wa, [k]: v } });
  const setSocial = (k, v) => setI({ social: { ...social, [k]: v } });
  const setAn = (k, v) => setI({ analytics: { ...analytics, [k]: v } });
  const setEmail = (k, v) => setI({ email: { ...email, [k]: v } });
  const setLoyalty = (k, v) => setI({ loyalty: { ...loyalty, [k]: v } });
  const setMedia = (k, v) => setS({ ...s, media: { ...media, [k]: v } });

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: {
        integrations: { whatsapp: wa, social, analytics, email, loyalty },
        media: { cloudName: media.cloudName.trim(), uploadPreset: media.uploadPreset.trim() },
      } });
      toast('Apps saved — applied to the website immediately');
    } catch (ex) { toast(ex.message || 'Could not save'); }
    setBusy(false);
  };

  const testEmail = async () => {
    const to = email.adminAlert || email.user;
    if (!to) return toast('Save your email settings first, then click Test');
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { integrations: { email } } });
      const res = await api('/settings/test-email', { method: 'POST', token: auth.token, body: { to } });
      toast(res.ok ? `Test sent to ${to}` : (res.reason || 'Test failed'));
    } catch (ex) { toast(ex.message || 'Test failed'); }
  };

  return (
    <AdminLayout title="Apps & Integrations">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366] text-white"><MessageCircle size={20} /></span>
              <div>
                <h2 className="font-sans text-lg">WhatsApp Help Center — Chat Button</h2>
                <p className="text-xs text-neutral-500">Floating green button on your website — customers can contact you directly on WhatsApp. Support, orders, sizing — all here.</p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={!!wa.enabled} onChange={(e) => setWa('enabled', e.target.checked)} />
              <span className="h-6 w-11 rounded-full bg-neutral-100 transition peer-checked:bg-neutral-900 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className={`mt-5 space-y-4 ${wa.enabled ? '' : 'pointer-events-none opacity-40'}`}>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">WhatsApp number (with country code)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" placeholder="923001234567" value={wa.number} onChange={(e) => setWa('number', e.target.value)} />
              <p className="mt-1 text-[12px] text-neutral-500">Example: 0300 1234567 → 923001234567 (remove the leading 0 and prefix '92')</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Default message (customer's first message)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={wa.message} onChange={(e) => setWa('message', e.target.value)} />
            </div>
            <div className="mt-5 border-t border-neutral-100 pt-5">
              <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Admin new-order alerts</p>
              <p className="mt-1 text-[12px] text-neutral-500">Every new order fires a click-to-open WhatsApp link with the order summary. Free — no API needed.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Your WhatsApp (receives alerts)</label>
                  <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" placeholder="923001234567" value={wa.adminAlertNumber} onChange={(e) => setWa('adminAlertNumber', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Webhook URL (optional — for automation)</label>
                  <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs" placeholder="https://hook.make.com/…" value={wa.webhookUrl} onChange={(e) => setWa('webhookUrl', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-sans text-lg">Loyalty rewards</h2>
              <p className="text-xs text-neutral-500">Automatically email a coupon to any customer who has completed N delivered orders. Retains repeat buyers.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="peer sr-only" checked={loyalty.enabled} onChange={(e) => setLoyalty('enabled', e.target.checked)} />
              <div className="relative h-6 w-11 rounded-full bg-neutral-100 transition peer-checked:bg-emerald-50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className={`mt-5 grid gap-3 md:grid-cols-3 ${loyalty.enabled ? '' : 'pointer-events-none opacity-40'}`}>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Fires every N delivered orders</label>
              <input type="number" min={2} max={10} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={loyalty.threshold} onChange={(e) => setLoyalty('threshold', parseInt(e.target.value, 10) || 2)} />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Discount %</label>
              <input type="number" min={1} max={50} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={loyalty.discountPercent} onChange={(e) => setLoyalty('discountPercent', parseInt(e.target.value, 10) || 10)} />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Coupon valid (days)</label>
              <input type="number" min={7} max={365} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={loyalty.validDays} onChange={(e) => setLoyalty('validDays', parseInt(e.target.value, 10) || 60)} />
            </div>
          </div>
          <p className="mt-3 text-[12px] text-neutral-500">
            A unique <code>HUSH-XXXXX</code> coupon is minted the moment the qualifying order is marked Delivered. Sent to the customer's email automatically.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="font-sans text-lg">Social Links</h2>
          <p className="mt-1 text-xs text-neutral-500">These links appear as icons in the footer. Leave empty to hide the icon.</p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label flex items-center gap-1.5"><Instagram size={13} /> Instagram URL</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" placeholder="https://instagram.com/hushae.pk" value={social.instagram} onChange={(e) => setSocial('instagram', e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Facebook size={13} /> Facebook URL</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" placeholder="https://facebook.com/hushae.pk" value={social.facebook} onChange={(e) => setSocial('facebook', e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Music2 size={13} /> TikTok URL</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" placeholder="https://tiktok.com/@hushae.pk" value={social.tiktok} onChange={(e) => setSocial('tiktok', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white"><HardDrive size={20} /></span>
            <div>
              <h2 className="font-sans text-lg">Media Library — PC se Image & Video Upload</h2>
              <p className="mt-0.5 text-xs text-neutral-500"><b className="text-neutral-900">Images upload without any setup</b> (they save into the database). This optional connection is only for <b className="text-neutral-900">videos and large files</b> .</p>
            </div>
            {media.cloudName && media.uploadPreset && <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">Connected</span>}
          </div>
          <ol className="mt-4 list-decimal space-y-1.5 rounded-2xl border border-neutral-200 bg-neutral-100 p-4 pl-9 text-xs leading-relaxed text-neutral-500">
            <li><b className="text-neutral-900">cloudinary.com</b> and create a free account (email + password — completely free)</li>
            <li>On the Dashboard you will find <b className="text-neutral-900">Cloud Name</b> —Copy it</li>
            <li>⚙️ Settings → <b className="text-neutral-900">Upload</b> → Upload presets → <b className="text-neutral-900">Add upload preset</b></li>
            <li><b className="text-neutral-900">Signing Mode: Unsigned</b> — Save the preset andCopy its name</li>
            <li>Paste both fields below and click Save — done!</li>
          </ol>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Cloud Name</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" placeholder="e.g. dxyz123ab" value={media.cloudName} onChange={(e) => setMedia('cloudName', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Upload Preset</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" placeholder="e.g. hushae_uploads" value={media.uploadPreset} onChange={(e) => setMedia('uploadPreset', e.target.value)} />
            </div>
          </div>
        </div>

        {/* EMAIL / SMTP — Order confirmation & admin alerts */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white"><Mail size={20} /></span>
            <div>
              <h2 className="font-sans text-lg">Email — Order confirmations & Admin alerts</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Connect any SMTP provider. Customers get order confirmation & status emails automatically; you get a new-order alert.
              </p>
            </div>
            {(email.host && email.user) && (
              <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">Connected</span>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">SMTP host</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs" placeholder="smtp.gmail.com" value={email.host} onChange={(e) => setEmail('host', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Port</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" placeholder="587" value={email.port} onChange={(e) => setEmail('port', Number(e.target.value) || 587)} />
              <label className="mt-2 flex items-center gap-2 text-[12px] text-neutral-500">
                <input type="checkbox" checked={!!email.secure} onChange={(e) => setEmail('secure', e.target.checked)} className="h-3.5 w-3.5 accent-obsidian" />
                Use SSL (usually only for port 465)
              </label>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Username</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" placeholder="you@yourstore.com" value={email.user} onChange={(e) => setEmail('user', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Password / App password</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs" type="password" placeholder="•••••••••••" value={email.pass} onChange={(e) => setEmail('pass', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">"From" address</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" placeholder='"HUSHAE" &lt;no-reply@hushae.pk&gt;' value={email.from} onChange={(e) => setEmail('from', e.target.value)} />
              <p className="mt-1.5 text-[12px] text-neutral-500">Leave blank to use your username.</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Admin alert address</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" placeholder="you@yourstore.com" value={email.adminAlert} onChange={(e) => setEmail('adminAlert', e.target.value)} />
              <p className="mt-1.5 text-[12px] text-neutral-500">Where new-order alerts go. Defaults to Username if empty.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={testEmail} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-100">
              Send test email
            </button>
            <span className="text-[12px] text-neutral-500">Save your changes first, then send a test.</span>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-100 p-3 text-[12px] leading-relaxed text-neutral-500">
            <b className="text-neutral-900">Gmail tip:</b> Turn on 2-Step Verification in Google Account, then create an "App password" — use that as the SMTP password. Host = <code>smtp.gmail.com</code>, port = <code>587</code>, SSL = off.
          </div>
        </div>

        {/* ANALYTICS & PIXELS — GA4, GTM, Meta Pixel, TikTok Pixel */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white"><LineChart size={20} /></span>
            <div>
              <h2 className="font-sans text-lg">Analytics & Tracking Pixels</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Connect Google Analytics + Meta/TikTok Pixel. <b className="text-neutral-900">Cookie consent</b> is granted before any scripts load (privacy-safe).
              </p>
            </div>
            {(analytics.gaId || analytics.metaPixelId) && (
              <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">Connected</span>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Google Analytics 4 ID</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs" placeholder="G-XXXXXXXXXX" value={analytics.gaId} onChange={(e) => setAn('gaId', e.target.value)} />
              <p className="mt-1.5 text-[12px] text-neutral-500">
                <a href="https://analytics.google.com" target="_blank" rel="noreferrer" className="underline hover:text-neutral-900">analytics.google.com</a> → Property banayein → Data streams → Measurement IDCopy it
              </p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Google Tag Manager ID (optional)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs" placeholder="GTM-XXXXXXX" value={analytics.gtmId} onChange={(e) => setAn('gtmId', e.target.value)} />
              <p className="mt-1.5 text-[12px] text-neutral-500">Advanced users only — fill this if you are using GTM</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Microsoft Clarity Project ID</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs" placeholder="xxxxxxxxxx" value={analytics.clarityId} onChange={(e) => setAn('clarityId', e.target.value)} />
              <p className="mt-1.5 text-[12px] text-neutral-500">clarity.microsoft.com → Project settings → Copy Project ID</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Meta (Facebook) Pixel ID</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs" placeholder="1234567890123456" value={analytics.metaPixelId} onChange={(e) => setAn('metaPixelId', e.target.value)} />
              <p className="mt-1.5 text-[12px] text-neutral-500">
                <a href="https://business.facebook.com/events_manager" target="_blank" rel="noreferrer" className="underline hover:text-neutral-900">Meta Events Manager</a> → Data source → Pixel IDCopy it
              </p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">TikTok Pixel ID (optional)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs" placeholder="CXXXXXXXXXXXXXXXXXXX" value={analytics.tiktokPixelId} onChange={(e) => setAn('tiktokPixelId', e.target.value)} />
              <p className="mt-1.5 text-[12px] text-neutral-500">TikTok Ads Manager → Assets → Events → Web events → Pixel ID</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-100 p-3 text-[12px] leading-relaxed text-neutral-500">
            <b className="text-neutral-900">Privacy note:</b> These scripts only load once the customer allows "Analytics" (GA/GTM)  or "Marketing" (Meta/TikTok Pixel) in the cookie consent. Leaving fields empty disables tracking.
          </div>
        </div>
      </div>
      <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black mt-6 w-full lg:w-auto">{busy ? 'Saving…' : 'Save Changes'}</button>
    </AdminLayout>
  );
}
