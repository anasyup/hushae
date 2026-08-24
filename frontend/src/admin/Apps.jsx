import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdToggle, EdText, EdNum, MonoStatus,
  TableSkeleton, EditorialError, btnGhost, btnSolid,
} from './settings/chrome';

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
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings/admin', { token: auth.token })
      .then((d) => setS(d.settings))
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
  }, []); // eslint-disable-line

  if (!s && !err) {
    return <AdminLayout title="Integrations"><PageHeader title="Integrations" description="Connected services." /><TableSkeleton rows={8} /></AdminLayout>;
  }
  if (err || !s) {
    return (
      <AdminLayout title="Integrations">
        <PageHeader title="Integrations" description="Connected services." />
        <EditorialError title="Unable to load settings" description={err} onRetry={() => window.location.reload()} />
      </AdminLayout>
    );
  }

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
    <AdminLayout title="Integrations">
      <PageHeader
        title="Integrations"
        description="WhatsApp, social, analytics pixels, SMTP and media library."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Integrations' }]}
        actions={<button type="button" onClick={save} disabled={busy} className={btnSolid}>{busy ? 'Saving…' : 'Save changes'}</button>}
      />

      <EdSection index={1} title="WhatsApp" description="Floating chat button and new-order alerts.">
        <EdToggle label="Enable WhatsApp chat button" checked={!!wa.enabled} onChange={(v) => setWa('enabled', v)} />
        <div className={`mt-4 space-y-4 ${wa.enabled ? '' : 'opacity-40'}`}>
          <EdText label="WhatsApp number (with country code)" value={wa.number} onChange={(v) => setWa('number', v)} placeholder="923001234567" hint="Example: 0300 1234567 → 923001234567" />
          <EdText label="Default message" value={wa.message} onChange={(v) => setWa('message', v)} />
          <div className="grid gap-4 md:grid-cols-2">
            <EdText label="Admin alert number" value={wa.adminAlertNumber} onChange={(v) => setWa('adminAlertNumber', v)} placeholder="923001234567" />
            <EdText label="Webhook URL (optional)" value={wa.webhookUrl} onChange={(v) => setWa('webhookUrl', v)} placeholder="https://hook.make.com/…" />
          </div>
        </div>
      </EdSection>

      <EdSection index={2} title="Loyalty coupon" description="Email a coupon after N delivered orders. Separate from Settings → Loyalty.">
        <EdToggle label="Enable automatic loyalty coupon" checked={loyalty.enabled} onChange={(v) => setLoyalty('enabled', v)} />
        <div className={`mt-4 grid gap-4 md:grid-cols-3 ${loyalty.enabled ? '' : 'opacity-40'}`}>
          <EdNum label="Fires every N delivered orders" value={loyalty.threshold} onChange={(v) => setLoyalty('threshold', parseInt(v, 10) || 2)} min={2} max={10} />
          <EdNum label="Discount %" value={loyalty.discountPercent} onChange={(v) => setLoyalty('discountPercent', parseInt(v, 10) || 10)} min={1} max={50} />
          <EdNum label="Coupon valid (days)" value={loyalty.validDays} onChange={(v) => setLoyalty('validDays', parseInt(v, 10) || 60)} min={7} max={365} />
        </div>
        <p className="mt-3 text-[12px] text-[#AAAAAA]">A unique HUSH-XXXXX coupon is minted when the qualifying order is marked Delivered.</p>
      </EdSection>

      <EdSection index={3} title="Social" description="Footer icons. Leave empty to hide.">
        <div className="space-y-4">
          <EdText label="Instagram URL" value={social.instagram} onChange={(v) => setSocial('instagram', v)} placeholder="https://instagram.com/hushae.pk" />
          <EdText label="Facebook URL" value={social.facebook} onChange={(v) => setSocial('facebook', v)} placeholder="https://facebook.com/hushae.pk" />
          <EdText label="TikTok URL" value={social.tiktok} onChange={(v) => setSocial('tiktok', v)} placeholder="https://tiktok.com/@hushae.pk" />
        </div>
      </EdSection>

      <EdSection
        index={4}
        title="Media library"
        description="Images upload without setup. This connection is only for videos and large files."
        action={media.cloudName && media.uploadPreset ? <MonoStatus label="CONNECTED" /> : <MonoStatus label="NOT CONNECTED" dim />}
      >
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-[12px] leading-relaxed text-[#AAAAAA]">
          <li>Create a free account at cloudinary.com</li>
          <li>Copy Cloud Name from the dashboard</li>
          <li>Settings → Upload → Add upload preset</li>
          <li>Signing Mode: Unsigned — copy the preset name</li>
          <li>Paste both fields and save</li>
        </ol>
        <div className="grid gap-4 sm:grid-cols-2">
          <EdText label="Cloud name" value={media.cloudName} onChange={(v) => setMedia('cloudName', v)} placeholder="e.g. dxyz123ab" />
          <EdText label="Upload preset" value={media.uploadPreset} onChange={(v) => setMedia('uploadPreset', v)} placeholder="e.g. hushae_uploads" />
        </div>
      </EdSection>

      <EdSection
        index={5}
        title="Email / SMTP"
        description="Order confirmations and admin alerts. Also editable under Settings → Email."
        action={(email.host && email.user) ? <MonoStatus label="CONNECTED" /> : <MonoStatus label="NOT CONNECTED" dim />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <EdText label="SMTP host" value={email.host} onChange={(v) => setEmail('host', v)} placeholder="smtp.gmail.com" />
          <div>
            <EdNum label="Port" value={email.port} onChange={(v) => setEmail('port', Number(v) || 587)} />
            <label className="mt-2 flex items-center gap-2 text-[12px] text-[#777777]">
              <input type="checkbox" checked={!!email.secure} onChange={(e) => setEmail('secure', e.target.checked)} className="h-3.5 w-3.5 accent-white" />
              Use SSL (usually only for port 465)
            </label>
          </div>
          <EdText label="Username" value={email.user} onChange={(v) => setEmail('user', v)} placeholder="you@yourstore.com" />
          <EdText label="Password / App password" type="password" value={email.pass} onChange={(v) => setEmail('pass', v)} placeholder="•••••••••••" />
          <EdText label="From address" value={email.from} onChange={(v) => setEmail('from', v)} placeholder='"HUSHAE" <no-reply@hushae.pk>' hint="Leave blank to use your username." />
          <EdText label="Admin alert address" value={email.adminAlert} onChange={(v) => setEmail('adminAlert', v)} placeholder="you@yourstore.com" hint="Where new-order alerts go." />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={testEmail} className={btnGhost}>Send test email</button>
          <span className="text-[12px] text-[#AAAAAA]">Save your changes first, then send a test.</span>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-[#AAAAAA]">
          Gmail: turn on 2-Step Verification, create an App password. Host = smtp.gmail.com, port = 587, SSL = off.
        </p>
      </EdSection>

      <EdSection
        index={6}
        title="Analytics & pixels"
        description="Scripts load only after cookie consent."
        action={(analytics.gaId || analytics.metaPixelId) ? <MonoStatus label="CONNECTED" /> : <MonoStatus label="NOT CONNECTED" dim />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <EdText label="Google Analytics 4 ID" value={analytics.gaId} onChange={(v) => setAn('gaId', v)} placeholder="G-XXXXXXXXXX" hint="analytics.google.com → Data streams → Measurement ID" />
          <EdText label="Google Tag Manager ID" value={analytics.gtmId} onChange={(v) => setAn('gtmId', v)} placeholder="GTM-XXXXXXX" hint="Optional — fill this if you are using GTM" />
          <EdText label="Microsoft Clarity Project ID" value={analytics.clarityId} onChange={(v) => setAn('clarityId', v)} placeholder="xxxxxxxxxx" hint="clarity.microsoft.com → Project settings" />
          <EdText label="Meta (Facebook) Pixel ID" value={analytics.metaPixelId} onChange={(v) => setAn('metaPixelId', v)} placeholder="1234567890123456" hint="Meta Events Manager → Pixel ID" />
          <EdText label="TikTok Pixel ID" value={analytics.tiktokPixelId} onChange={(v) => setAn('tiktokPixelId', v)} placeholder="CXXXXXXXXXXXXXXXXXXX" hint="TikTok Ads Manager → Web events" />
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-[#AAAAAA]">
          These scripts only load once the customer allows Analytics (GA/GTM) or Marketing (Meta/TikTok) in cookie consent.
        </p>
      </EdSection>
    </AdminLayout>
  );
}
