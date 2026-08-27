import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdSaveBar, EdText, EdSelect,
  TableSkeleton, btnGhost,
} from './settings/chrome';

/* ============================================================================
 * SETTINGS SUB-PAGES — Business Address / Time Zone / Currency
 * Same useSettingsSlice pattern as SettingsPages.jsx
 * ============================================================================ */

function useSettingsSlice() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings/admin', { token: auth.token })
      .then((d) => { setS(d.settings); setOriginal(JSON.stringify(d.settings)); })
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
  }, []); // eslint-disable-line

  const dirty = s && original && JSON.stringify(s) !== original;
  const reset = () => { if (original) setS(JSON.parse(original)); };

  const save = async (fieldsToSend) => {
    setBusy(true);
    try {
      const body = {};
      for (const f of fieldsToSend) if (s[f] !== undefined) body[f] = s[f];
      await api('/settings', { method: 'PUT', token: auth.token, body });
      setOriginal(JSON.stringify(s));
      toast('Saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return { s, setS, dirty, reset, save, busy, err };
}

function Shell({ title, description, actions, children, err }) {
  return (
    <AdminLayout title={title}>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: title }]}
        actions={actions}
      />
      {err ? (
        <div className="mt-8 flex items-center gap-3 border border-[#EAEAEA] px-4 py-6 text-[13px] text-[#777777]">
          <span>{err}</span>
          <Link to="/admin/settings" className={btnGhost}>Back to settings</Link>
        </div>
      ) : children}
    </AdminLayout>
  );
}

/* ==========================================================================
 * BUSINESS ADDRESS
 * ======================================================================== */
export function SettingsBusinessAddress() {
  const { s, setS, dirty, reset, save, busy, err } = useSettingsSlice();

  if (!s && !err) {
    return (
      <AdminLayout title="Business address">
        <PageHeader title="Business address" description="Your legal and postal information." />
        <TableSkeleton rows={7} />
      </AdminLayout>
    );
  }

  // Helper to update nested businessAddress object
  const setAddr = (k, v) =>
    setS({ ...s, businessAddress: { ...(s.businessAddress || {}), [k]: v } });

  return (
    <Shell
      title="Business address"
      description="Your legal company name, NTN, and physical address. Shown on invoices, legal pages, and in the store footer."
      actions={
        <button
          type="button"
          onClick={() => save(['businessAddress'])}
          disabled={busy || !dirty}
          className="adm-btn solid"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
      err={err}
    >
      {s && (
        <>
          <EdSection
            index={1}
            title="Legal information"
            description="Your registered business name and tax identification number."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <EdText
                label="Legal / company name"
                value={s.businessAddress?.legalName || ''}
                onChange={(v) => setAddr('legalName', v)}
                placeholder="e.g. HUSHAE Private Limited"
              />
              <EdText
                label="NTN / Tax ID"
                value={s.businessAddress?.ntn || ''}
                onChange={(v) => setAddr('ntn', v)}
                placeholder="e.g. 1234567-8"
              />
            </div>
          </EdSection>

          <EdSection
            index={2}
            title="Physical address"
            description="Displayed on invoices and in the store footer."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <EdText
                  label="Street address"
                  value={s.businessAddress?.street || ''}
                  onChange={(v) => setAddr('street', v)}
                  placeholder="e.g. Suite 12, Plot 45, Commercial Area"
                />
              </div>
              <EdText
                label="City"
                value={s.businessAddress?.city || ''}
                onChange={(v) => setAddr('city', v)}
                placeholder="e.g. Karachi"
              />
              <EdText
                label="Province / Region"
                value={s.businessAddress?.province || ''}
                onChange={(v) => setAddr('province', v)}
                placeholder="e.g. Sindh"
              />
              <EdText
                label="Postal / ZIP code"
                value={s.businessAddress?.postalCode || ''}
                onChange={(v) => setAddr('postalCode', v)}
                placeholder="e.g. 75500"
              />
              <EdText
                label="Country"
                value={s.businessAddress?.country || ''}
                onChange={(v) => setAddr('country', v)}
                placeholder="e.g. Pakistan"
              />
            </div>
          </EdSection>

          <EdSaveBar
            dirty={dirty}
            busy={busy}
            onSave={() => save(['businessAddress'])}
            onDiscard={reset}
          />
        </>
      )}
    </Shell>
  );
}

/* ==========================================================================
 * TIME ZONE
 * ======================================================================== */
const TIMEZONES = [
  { value: 'Asia/Karachi', label: 'Karachi (PKT, UTC+5) — Pakistan Standard Time' },
  { value: 'Asia/Kolkata', label: 'Kolkata (IST, UTC+5:30) — India Standard Time' },
  { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4) — Gulf Standard Time' },
  { value: 'Asia/Dhaka', label: 'Dhaka (BST, UTC+6) — Bangladesh Standard Time' },
  { value: 'Asia/Kabul', label: 'Kabul (AFT, UTC+4:30) — Afghanistan Time' },
  { value: 'Asia/Tehran', label: 'Tehran (IRST, UTC+3:30) — Iran Standard Time' },
  { value: 'Asia/Kathmandu', label: 'Kathmandu (NPT, UTC+5:45) — Nepal Time' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST, UTC+8) — China Standard Time' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT, UTC+8) — Singapore Time' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST, UTC+9) — Japan Standard Time' },
  { value: 'Europe/London', label: 'London (GMT/BST, UTC+0/+1) — United Kingdom' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST, UTC+1/+2) — Central European Time' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST, UTC+1/+2) — Germany' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK, UTC+3) — Russia Standard Time' },
  { value: 'America/New_York', label: 'New York (EST/EDT, UTC-5/-4) — Eastern Time' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT, UTC-6/-5) — Central Time' },
  { value: 'America/Denver', label: 'Denver (MST/MDT, UTC-7/-6) — Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT, UTC-8/-7) — Pacific Time' },
  { value: 'America/Toronto', label: 'Toronto (EST/EDT, UTC-5/-4) — Eastern Canada' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT, UTC+10/+11) — Australian Eastern Time' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT, UTC+12/+13) — New Zealand' },
  { value: 'UTC', label: 'UTC (UTC+0) — Coordinated Universal Time' },
];

export function SettingsTimezone() {
  const { s, setS, dirty, reset, save, busy, err } = useSettingsSlice();

  if (!s && !err) {
    return (
      <AdminLayout title="Time zone">
        <PageHeader title="Time zone" description="Store time zone for schedules and timestamps." />
        <TableSkeleton rows={3} />
      </AdminLayout>
    );
  }

  return (
    <Shell
      title="Time zone"
      description="Used by marketing campaign schedules and displayed timestamps in the admin. Pakistan stores typically use Asia/Karachi (UTC+5)."
      actions={
        <button
          type="button"
          onClick={() => save(['timezone'])}
          disabled={busy || !dirty}
          className="adm-btn solid"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
      err={err}
    >
      {s && (
        <>
          <EdSection
            index={1}
            title="Store time zone"
            description="All campaign start/end times, order timestamps, and schedule previews use this zone."
          >
            <div className="max-w-md">
              <EdSelect
                label="Time zone"
                value={s.timezone || 'Asia/Karachi'}
                onChange={(v) => setS({ ...s, timezone: v })}
                options={TIMEZONES}
              />
            </div>
          </EdSection>

          <EdSaveBar
            dirty={dirty}
            busy={busy}
            onSave={() => save(['timezone'])}
            onDiscard={reset}
          />
        </>
      )}
    </Shell>
  );
}

/* ==========================================================================
 * CURRENCY
 * ======================================================================== */
const CURRENCY_OPTIONS = [
  { value: 'PKR', label: 'PKR — Pakistani Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound Sterling' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'SAR', label: 'SAR — Saudi Riyal' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'CNY', label: 'CNY — Chinese Yuan' },
  { value: 'BHD', label: 'BHD — Bahraini Dinar' },
  { value: 'QAR', label: 'QAR — Qatari Riyal' },
  { value: 'OMR', label: 'OMR — Omani Rial' },
];

const POSITION_OPTIONS = [
  { value: 'before', label: 'Before amount — Rs. 1,500' },
  { value: 'after', label: 'After amount — 1,500 Rs.' },
];

const SEPARATOR_OPTIONS = [
  { value: ',', label: 'Comma — 1,500,000' },
  { value: '.', label: 'Dot — 1.500.000' },
  { value: ' ', label: 'Space — 1 500 000' },
];

const DECIMAL_OPTIONS = [
  { value: '.', label: 'Dot — 1500.50' },
  { value: ',', label: 'Comma — 1500,50' },
];

export function SettingsCurrency() {
  const { s, setS, dirty, reset, save, busy, err } = useSettingsSlice();

  if (!s && !err) {
    return (
      <AdminLayout title="Currency">
        <PageHeader title="Currency" description="Default currency for prices shown on the storefront." />
        <TableSkeleton rows={5} />
      </AdminLayout>
    );
  }

  const setCurr = (k, v) =>
    setS({ ...s, currency: { ...(s.currency || {}), [k]: v } });

  const curr = s.currency || {};

  return (
    <Shell
      title="Currency"
      description="The default currency for prices displayed on the storefront and in order invoices. For multi-currency support, add the Markets app."
      actions={
        <button
          type="button"
          onClick={() => save(['currency'])}
          disabled={busy || !dirty}
          className="adm-btn solid"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
      err={err}
    >
      {s && (
        <>
          <EdSection
            index={1}
            title="Currency"
            description="Choose the default currency and symbol. Prices in the admin are shown in this currency."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <EdSelect
                label="Currency code"
                value={curr.code || 'PKR'}
                onChange={(v) => setCurr('code', v)}
                options={CURRENCY_OPTIONS}
              />
              <EdText
                label="Currency symbol"
                value={curr.symbol || 'Rs.'}
                onChange={(v) => setCurr('symbol', v)}
                placeholder="e.g. Rs. or PKR"
              />
            </div>
          </EdSection>

          <EdSection
            index={2}
            title="Display format"
            description="How the symbol and amount are arranged in prices."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <EdSelect
                label="Symbol position"
                value={curr.position || 'before'}
                onChange={(v) => setCurr('position', v)}
                options={POSITION_OPTIONS}
              />
              <div />
              <EdSelect
                label="Thousand separator"
                value={curr.thousandSeparator || ','}
                onChange={(v) => setCurr('thousandSeparator', v)}
                options={SEPARATOR_OPTIONS}
              />
              <EdSelect
                label="Decimal separator"
                value={curr.decimalSeparator || '.'}
                onChange={(v) => setCurr('decimalSeparator', v)}
                options={DECIMAL_OPTIONS}
              />
            </div>
          </EdSection>

          {/* Preview */}
          <EdSection index={3} title="Preview">
            <div className="border border-[#EAEAEA] px-6 py-5">
              <p className="adm-eyebrow mb-3">How prices will appear</p>
              <p className="text-[24px] font-medium text-black">
                {curr.position === 'after'
                  ? `${1000000
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, curr.thousandSeparator || ',')}${curr.decimalSeparator || '.'}00 ${curr.symbol || 'Rs.'}`
                  : `${curr.symbol || 'Rs.'} ${1000000
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, curr.thousandSeparator || ',')}${curr.decimalSeparator || '.'}00`}
              </p>
              <p className="mt-2 text-[12px] text-[#777777]">
                Example: one million ({curr.code || 'PKR'})
              </p>
            </div>
          </EdSection>

          <EdSaveBar
            dirty={dirty}
            busy={busy}
            onSave={() => save(['currency'])}
            onDiscard={reset}
          />
        </>
      )}
    </Shell>
  );
}
