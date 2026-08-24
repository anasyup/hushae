import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, ctl, TableSkeleton } from './orders/orderUi';

export default function Marketing() {
  const { auth, toast } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErr('');
    try {
      const [dSettings, dDashboard] = await Promise.all([
        api('/settings/admin', { token: auth.token }),
        api('/marketing/automation/dashboard', { token: auth.token }),
      ]);
      setSettings(dSettings.settings);
      setOriginalSettings(JSON.stringify(dSettings.settings));
      setMetrics(dDashboard.metrics || {});
    } catch {
      setErr('Something prevented marketing from loading.');
      toast('Failed to load marketing dashboard details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  const isDirty = settings && originalSettings && JSON.stringify(settings) !== originalSettings;

  const handleSaveSettings = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { automation: settings.automation } });
      setOriginalSettings(JSON.stringify(settings));
      toast('Marketing automation rules saved successfully.');
    } catch (e) {
      toast(e.message || 'Failed to save settings.');
    } finally {
      setBusy(false);
    }
  };

  const auto = settings?.automation || { abandonedCart: { enabled: false, delayHours: 2 }, reviewRequest: { enabled: false, delayDays: 7 } };
  const updateAuto = (type, key, value) => {
    setSettings((prev) => ({
      ...prev,
      automation: {
        ...prev.automation,
        [type]: { ...prev.automation[type], [key]: value },
      },
    }));
  };

  const m = metrics || {};

  return (
    <AdminLayout title="Marketing">
      <PageHeader
        title="Marketing"
        description="Campaigns, promotions and customer acquisition."
        actions={(
          <>
            <Link to="/admin/promotions" className={btnGhost}>Promotions</Link>
            <Link to="/admin/marketing/analytics" className={btnGhost}>Performance</Link>
          </>
        )}
      />

      {loading && <TableSkeleton rows={5} />}
      {err && !loading && (
        <div className="border-y border-[#EAEAEA] py-14 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#333333]">Unable to load marketing</p>
          <p className="mt-3 text-[13px] text-[#AAAAAA]">{err}</p>
          <button type="button" onClick={loadData} className={`${btnGhost} mt-6`}>Try again</button>
        </div>
      )}

      {!loading && !err && (
        <>
          <section className="mb-10">
            <p className="adm-index">01 — Performance</p>
            <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] lg:grid-cols-4">
              {[
                { label: 'Abandoned carts', value: m.abandonedCartCount ?? 0 },
                { label: 'Recovered', value: m.recoveredCount ?? 0 },
                { label: 'Recovery rate', value: `${m.recoveryRate ?? 0}%` },
                { label: 'Review response', value: `${m.responseRate ?? 0}%` },
              ].map((x) => (
                <div key={x.label} className="px-5 py-6">
                  <p className="adm-label">{x.label}</p>
                  <p className="adm-metric mt-3 text-[32px] leading-none text-black">{x.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[#AAAAAA]">
              {m.reviewsCount ?? 0} reviews from {m.reviewRequestsCount ?? 0} requests
              {m.emailDeliveryRate != null ? ` · delivery ${m.emailDeliveryRate}%` : ''}
              {m.emailOpenRate != null ? ` · open ${m.emailOpenRate}%` : ''}
            </p>
          </section>

          <section className="mb-10">
            <p className="adm-index">02 — Campaigns & promotions</p>
            <div className="divide-y divide-[#EAEAEA] border-y border-[#EAEAEA]">
              {[
                { to: '/admin/promotions', label: 'Promotions', hint: 'Automatic discounts' },
                { to: '/admin/discounts', label: 'Discount codes', hint: 'Checkout coupons' },
                { to: '/admin/banners', label: 'Banners', hint: 'Slots and schedules' },
                { to: '/admin/email-campaigns', label: 'Email campaigns', hint: 'Sent history' },
              ].map((x) => (
                <Link key={x.to} to={x.to} className="flex items-center justify-between gap-4 py-4 adm-row-hover">
                  <span>
                    <span className="block text-[13px] font-medium text-black">{x.label}</span>
                    <span className="mt-0.5 block text-[12px] text-[#AAAAAA]">{x.hint}</span>
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[#AAAAAA]">Open →</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <p className="adm-index">03 — Automation</p>
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={handleSaveSettings} disabled={busy || !isDirty} className={btnSolid}>
                <Save size={12} /> {busy ? 'Saving…' : 'Save rules'}
              </button>
            </div>
            <div className="space-y-8 border-y border-[#EAEAEA] py-6">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-black">Abandoned cart recovery</p>
                    <p className="mt-1 text-[12px] text-[#AAAAAA]">Email buyers who leave checkout incomplete.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!auto.abandonedCart?.enabled}
                    onClick={() => updateAuto('abandonedCart', 'enabled', !auto.abandonedCart?.enabled)}
                    className={`relative h-5 w-9 shrink-0 rounded-full ${auto.abandonedCart?.enabled ? 'bg-white' : 'bg-[#EFEFEF]'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${auto.abandonedCart?.enabled ? 'left-[18px] bg-black' : 'left-0.5 bg-white'}`} />
                  </button>
                </div>
                <div className={`mt-4 ${auto.abandonedCart?.enabled ? '' : 'opacity-35'}`}>
                  <label className="adm-label mb-1.5 block">Send after (hours)</label>
                  <input
                    type="number" min={1} max={24}
                    className={`${ctl} max-w-[120px]`}
                    value={auto.abandonedCart?.delayHours || 2}
                    onChange={(e) => updateAuto('abandonedCart', 'delayHours', Number(e.target.value) || 2)}
                    disabled={!auto.abandonedCart?.enabled}
                  />
                </div>
              </div>

              <div className="border-t border-[#EAEAEA] pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-black">Review request</p>
                    <p className="mt-1 text-[12px] text-[#AAAAAA]">Ask for a review after delivery.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!auto.reviewRequest?.enabled}
                    onClick={() => updateAuto('reviewRequest', 'enabled', !auto.reviewRequest?.enabled)}
                    className={`relative h-5 w-9 shrink-0 rounded-full ${auto.reviewRequest?.enabled ? 'bg-white' : 'bg-[#EFEFEF]'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${auto.reviewRequest?.enabled ? 'left-[18px] bg-black' : 'left-0.5 bg-white'}`} />
                  </button>
                </div>
                <div className={`mt-4 ${auto.reviewRequest?.enabled ? '' : 'opacity-35'}`}>
                  <label className="adm-label mb-1.5 block">Send after (days)</label>
                  <input
                    type="number" min={1} max={30}
                    className={`${ctl} max-w-[120px]`}
                    value={auto.reviewRequest?.delayDays || 7}
                    onChange={(e) => updateAuto('reviewRequest', 'delayDays', Number(e.target.value) || 7)}
                    disabled={!auto.reviewRequest?.enabled}
                  />
                </div>
              </div>
            </div>
            <Link to="/admin/marketing/settings" className="mt-4 inline-block text-[11px] uppercase tracking-[0.14em] text-[#999999] hover:text-black">
              Full marketing rules →
            </Link>
          </section>

          <section>
            <p className="adm-index">04 — Recovery</p>
            <Link to="/admin/abandoned-carts" className="flex items-center justify-between border-y border-[#EAEAEA] py-5 adm-row-hover">
              <span>
                <span className="block text-[13px] font-medium text-black">Abandoned carts</span>
                <span className="mt-0.5 block text-[12px] text-[#AAAAAA]">{m.abandonedCartCount ?? 0} open · {m.recoveredCount ?? 0} recovered</span>
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-[#AAAAAA]">Open →</span>
            </Link>
          </section>
        </>
      )}
    </AdminLayout>
  );
}
