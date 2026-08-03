import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Save, Users } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { ACCOUNT_DEFAULTS } from '../lib/accountConfig';

/* ============================================================================
 * ADMIN → SETTINGS → CUSTOMER ACCOUNTS
 *
 * Writes exactly one top-level field: `account`.
 *
 * The email section is deliberately honest: it reads /auth/policy to find out
 * whether mail can ACTUALLY be sent, and says so. A merchant switching
 * "password reset by email" on while SMTP is unconfigured would otherwise
 * believe the feature is live when the server is still refusing it.
 * ========================================================================== */

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{title}</p>
        {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-neutral-300'}`}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-neutral-900">{label}</p>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">{description}</p>}
      </div>
      <button
        type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-neutral-900' : 'bg-neutral-300'} ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function Num({ label, hint, value, onChange, ...rest }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</label>
      <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} {...rest} />
      {hint && <p className="mt-1.5 text-[11px] text-neutral-500">{hint}</p>}
    </div>
  );
}

function Text({ label, hint, value, onChange, ...rest }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</label>
      <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <p className="mt-1.5 text-[11px] text-neutral-500">{hint}</p>}
    </div>
  );
}

export default function SettingsAccounts() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mailReady, setMailReady] = useState(null);

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const next = { ...d.settings, account: { ...ACCOUNT_DEFAULTS, ...(d.settings.account || {}) } };
        setS(next);
        setOriginal(JSON.stringify(next));
      })
      .catch(() => toast('Could not load settings'));
    // What the server can genuinely do right now.
    api('/auth/policy').then((p) => setMailReady(!!p.emailFeatures)).catch(() => setMailReady(false));
  }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="Customer Accounts"><div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" /></AdminLayout>;

  const a = s.account;
  const set = (k, v) => setS({ ...s, account: { ...s.account, [k]: v } });
  const dirty = original && JSON.stringify(s) !== original;

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

  // Merchant wants email features, but the server says it cannot send.
  const emailMismatch = a.emailFeatures && mailReady === false;

  return (
    <AdminLayout title="Customer Accounts">
      <Link to="/admin/settings" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Settings
      </Link>

      <div className="mb-6 flex items-start gap-4 border-b border-neutral-200 pb-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
          <Users size={20} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="font-sans text-2xl leading-tight text-neutral-900">Customer Accounts</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            Who can register, how strong passwords must be, and what customers can do in their account area.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <Section title="Sign up & sign in">
          <div className="space-y-3">
            <Toggle
              label="Allow new customers to register"
              description="Turn off to stop new sign-ups. Existing customers can still sign in, and guest checkout keeps working."
              checked={a.registrationEnabled} onChange={(v) => set('registrationEnabled', v)}
            />
            <Toggle
              label="Ask for a mobile number when registering"
              description="Recommended in Pakistan — couriers call before delivery."
              checked={a.phoneRequired} onChange={(v) => set('phoneRequired', v)}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="Stay signed in for (days)" value={a.rememberMeDays} onChange={(v) => set('rememberMeDays', v)} min="1" max="365"
              hint="Used when the customer ticks “Keep me signed in”." />
            <Num label="Normal session length (days)" value={a.sessionDays} onChange={(v) => set('sessionDays', v)} min="1" max="90"
              hint="Used when they do not tick it." />
          </div>
        </Section>

        <Section title="Email features" description="Password reset and email confirmation both need an email service. Connect one in Settings → Apps & Integrations first.">
          {mailReady === false && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-[12px] leading-relaxed text-amber-900">
                <b>No email service is connected yet.</b> Until one is, “Forgot password” stays hidden from customers
                and the server will refuse to send confirmation emails — rather than pretending it sent something.
              </p>
            </div>
          )}
          {mailReady === true && (
            <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-900">
              Email service is connected and working.
            </p>
          )}
          <div className="space-y-3">
            <Toggle
              label="Allow password reset by email"
              description="Shows “Forgot password?” on the sign-in form."
              checked={a.emailFeatures} onChange={(v) => set('emailFeatures', v)}
            />
            <Toggle
              label="Require customers to confirm their email"
              description="New accounts get a confirmation link. Only works when an email service is connected."
              checked={a.emailVerifyRequired} onChange={(v) => set('emailVerifyRequired', v)}
              disabled={!a.emailFeatures}
            />
          </div>
          {emailMismatch && (
            <p className="mt-3 text-[11px] font-medium text-amber-800">
              This is switched on but cannot work yet — customers will not see it until an email service is connected.
            </p>
          )}
        </Section>

        <Section title="Password rules" description="Applied when customers register, reset, or change their password.">
          <Num label="Minimum length" value={a.passwordMinLength} onChange={(v) => set('passwordMinLength', v)} min="6" max="64" />
          <div className="mt-4 space-y-3">
            <Toggle label="Must include a letter" checked={a.passwordRequireLetter} onChange={(v) => set('passwordRequireLetter', v)} />
            <Toggle label="Must include a number" checked={a.passwordRequireNumber} onChange={(v) => set('passwordRequireNumber', v)} />
            <Toggle label="Must include a symbol" description="Stronger, but harder to type on a phone." checked={a.passwordRequireSymbol} onChange={(v) => set('passwordRequireSymbol', v)} />
          </div>
        </Section>

        <Section title="Profile">
          <div className="space-y-3">
            <Toggle label="Allow profile photos" checked={a.avatarEnabled} onChange={(v) => set('avatarEnabled', v)} />
            <Toggle label="Allow customers to close their own account" description="Their past orders always stay with you as business records." checked={a.allowDeleteAccount} onChange={(v) => set('allowDeleteAccount', v)} />
          </div>
          <div className="mt-4">
            <Num label="Maximum saved addresses per customer" value={a.maxAddresses} onChange={(v) => set('maxAddresses', v)} min="1" max="20" />
          </div>
        </Section>

        <Section title="What customers can do" description="Some of these are used by features arriving in the next release; switching them now is safe.">
          <div className="space-y-3">
            <Toggle label="Show wishlist in the account area" checked={a.showWishlist} onChange={(v) => set('showWishlist', v)} />
            <Toggle label="Show recently viewed products" checked={a.showRecentlyViewed} onChange={(v) => set('showRecentlyViewed', v)} />
            <Toggle label="Show active sessions / devices" checked={a.showSessions} onChange={(v) => set('showSessions', v)} />
            <Toggle label="Show notification preferences" checked={a.showNotifications} onChange={(v) => set('showNotifications', v)} />
            <Toggle label="Allow reordering a past order" checked={a.allowReorder} onChange={(v) => set('allowReorder', v)} />
            <Toggle label="Allow order cancellation requests" checked={a.allowCancelRequest} onChange={(v) => set('allowCancelRequest', v)} />
            <Toggle label="Allow return requests" checked={a.allowReturnRequest} onChange={(v) => set('allowReturnRequest', v)} />
            <Toggle label="Allow invoice download" checked={a.allowInvoice} onChange={(v) => set('allowInvoice', v)} />
          </div>
        </Section>

        <Section title="Wording">
          <div className="space-y-4">
            <Text label="Sign-in page title" value={a.signInTitle} onChange={(v) => set('signInTitle', v)} />
            <Text label="Sign-in page subtitle" value={a.signInSubtitle} onChange={(v) => set('signInSubtitle', v)} />
            <Text label="Greeting after signing in" value={a.welcomeGreeting} onChange={(v) => set('welcomeGreeting', v)} />
            <Text label="Guest note under the form" value={a.guestNote} onChange={(v) => set('guestNote', v)} />
          </div>
        </Section>
      </div>

      {dirty && (
        <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-900 bg-neutral-900 px-4 py-3 text-white shadow-xl">
          <p className="text-[13px] font-medium">Unsaved changes</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setS(JSON.parse(original))} className="rounded-lg border border-white/20 px-3 py-1.5 text-[12px] font-semibold text-white/80 transition hover:bg-white/10">Discard</button>
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-1.5 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50">
              <Save size={13} /> {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
