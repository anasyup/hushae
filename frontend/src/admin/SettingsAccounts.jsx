import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { ACCOUNT_DEFAULTS } from '../lib/accountConfig';
import {
  PageHeader, EdSection, EdSaveBar, EdToggle, EdText, EdNum, EdNotice,
  TableSkeleton, EditorialError,
} from './settings/chrome';

export default function SettingsAccounts() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mailReady, setMailReady] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const next = { ...d.settings, account: { ...ACCOUNT_DEFAULTS, ...(d.settings.account || {}) } };
        setS(next);
        setOriginal(JSON.stringify(next));
      })
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
    api('/auth/policy').then((p) => setMailReady(!!p.emailFeatures)).catch(() => setMailReady(false));
  }, []); // eslint-disable-line

  if (!s && !err) {
    return <AdminLayout title="Customer Accounts"><PageHeader title="Customer Accounts" description="Registration and account rules." /><TableSkeleton rows={7} /></AdminLayout>;
  }
  if (err || !s) {
    return (
      <AdminLayout title="Customer Accounts">
        <PageHeader title="Customer Accounts" description="Registration and account rules." />
        <EditorialError title="Unable to load settings" description={err} onRetry={() => window.location.reload()} />
      </AdminLayout>
    );
  }

  const a = s.account;
  const set = (k, v) => setS({ ...s, account: { ...s.account, [k]: v } });
  const dirty = original && JSON.stringify(s) !== original;
  const emailMismatch = a.emailFeatures && mailReady === false;

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { account: s.account } });
      setOriginal(JSON.stringify(s));
      toast('Account settings saved');
      api('/auth/policy').then((p) => setMailReady(!!p.emailFeatures)).catch(() => {});
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Customer Accounts">
      <PageHeader
        title="Customer Accounts"
        description="Who can register, how strong passwords must be, and what customers can do."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Customer Accounts' }]}
      />

      <EdSection index={1} title="Sign up & sign in">
        <EdToggle label="Allow new customers to register" description="Turn off to stop new sign-ups. Existing customers can still sign in." checked={a.registrationEnabled} onChange={(v) => set('registrationEnabled', v)} />
        <EdToggle label="Ask for a mobile number when registering" description="Recommended in Pakistan — couriers call before delivery." checked={a.phoneRequired} onChange={(v) => set('phoneRequired', v)} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdNum label="Stay signed in for (days)" value={a.rememberMeDays} onChange={(v) => set('rememberMeDays', v)} min="1" max="365" hint="Used when the customer ticks Keep me signed in." />
          <EdNum label="Normal session length (days)" value={a.sessionDays} onChange={(v) => set('sessionDays', v)} min="1" max="90" hint="Used when they do not tick it." />
        </div>
      </EdSection>

      <EdSection index={2} title="Email features" description="Password reset and email confirmation both need an email service. Connect one in Settings → Apps first.">
        {mailReady === false && (
          <EdNotice>
            No email service is connected yet. Until one is, “Forgot password” stays hidden and the server will refuse to send confirmation emails.
          </EdNotice>
        )}
        {mailReady === true && (
          <p className="mb-4 text-[12px] text-[#999999]">Email service is connected and working.</p>
        )}
        <EdToggle label="Allow password reset by email" description="Shows Forgot password? on the sign-in form." checked={a.emailFeatures} onChange={(v) => set('emailFeatures', v)} />
        <EdToggle label="Require customers to confirm their email" description="New accounts get a confirmation link. Only works when email is connected." checked={a.emailVerifyRequired} onChange={(v) => set('emailVerifyRequired', v)} disabled={!a.emailFeatures} />
        {emailMismatch && <p className="mt-3 text-[12px] text-white/45">This is switched on but cannot work yet — customers will not see it until an email service is connected.</p>}
      </EdSection>

      <EdSection index={3} title="Password rules">
        <EdNum label="Minimum length" value={a.passwordMinLength} onChange={(v) => set('passwordMinLength', v)} min="6" max="64" />
        <div className="mt-4">
          <EdToggle label="Must include a letter" checked={a.passwordRequireLetter} onChange={(v) => set('passwordRequireLetter', v)} />
          <EdToggle label="Must include a number" checked={a.passwordRequireNumber} onChange={(v) => set('passwordRequireNumber', v)} />
          <EdToggle label="Must include a symbol" description="Stronger, but harder to type on a phone." checked={a.passwordRequireSymbol} onChange={(v) => set('passwordRequireSymbol', v)} />
        </div>
      </EdSection>

      <EdSection index={4} title="Profile">
        <EdToggle label="Allow profile photos" checked={a.avatarEnabled} onChange={(v) => set('avatarEnabled', v)} />
        <EdToggle label="Allow customers to close their own account" description="Past orders always stay as business records." checked={a.allowDeleteAccount} onChange={(v) => set('allowDeleteAccount', v)} />
        <div className="mt-4">
          <EdNum label="Maximum saved addresses per customer" value={a.maxAddresses} onChange={(v) => set('maxAddresses', v)} min="1" max="20" />
        </div>
      </EdSection>

      <EdSection index={5} title="What customers can do">
        <EdToggle label="Show wishlist in the account area" checked={a.showWishlist} onChange={(v) => set('showWishlist', v)} />
        <EdToggle label="Show recently viewed products" checked={a.showRecentlyViewed} onChange={(v) => set('showRecentlyViewed', v)} />
        <EdToggle label="Show active sessions / devices" checked={a.showSessions} onChange={(v) => set('showSessions', v)} />
        <EdToggle label="Show notification preferences" checked={a.showNotifications} onChange={(v) => set('showNotifications', v)} />
        <EdToggle label="Allow reordering a past order" checked={a.allowReorder} onChange={(v) => set('allowReorder', v)} />
        <EdToggle label="Allow order cancellation requests" checked={a.allowCancelRequest} onChange={(v) => set('allowCancelRequest', v)} />
        <EdToggle label="Allow return requests" checked={a.allowReturnRequest} onChange={(v) => set('allowReturnRequest', v)} />
        <EdToggle label="Allow invoice download" checked={a.allowInvoice} onChange={(v) => set('allowInvoice', v)} />
      </EdSection>

      <EdSection index={6} title="Wording">
        <div className="space-y-4">
          <EdText label="Sign-in page title" value={a.signInTitle} onChange={(v) => set('signInTitle', v)} />
          <EdText label="Sign-in page subtitle" value={a.signInSubtitle} onChange={(v) => set('signInSubtitle', v)} />
          <EdText label="Greeting after signing in" value={a.welcomeGreeting} onChange={(v) => set('welcomeGreeting', v)} />
          <EdText label="Guest note under the form" value={a.guestNote} onChange={(v) => set('guestNote', v)} />
        </div>
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setS(JSON.parse(original))} />
    </AdminLayout>
  );
}
