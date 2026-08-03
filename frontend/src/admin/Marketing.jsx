import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Megaphone, Save, ShieldAlert, Sparkles, Star, TrendingUp, AlertTriangle, Play, RefreshCw, Mail, ShoppingBag
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

function BackToSettings() {
  return (
    <Link to="/admin/settings" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-900">
      <ArrowLeft size={13} /> Settings
    </Link>
  );
}

function PageIntro({ icon: Icon, title, description }) {
  return (
    <div className="mb-6 flex items-start gap-4 border-b border-neutral-200 pb-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="font-sans text-2xl leading-tight text-neutral-900">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

function Section({ title, description, children, action }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-900">{title}</p>
          {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}

export default function Marketing() {
  const { auth, toast } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dSettings, dDashboard] = await Promise.all([
        api('/settings/admin', { token: auth.token }),
        api('/marketing/automation/dashboard', { token: auth.token })
      ]);
      setSettings(dSettings.settings);
      setOriginalSettings(JSON.stringify(dSettings.settings));
      setMetrics(dDashboard.metrics);
    } catch (err) {
      toast('Failed to load marketing dashboard details.');
    } finally {
      setLoading(false);
    }
  };

  const isDirty = settings && originalSettings && JSON.stringify(settings) !== originalSettings;

  const handleSaveSettings = async () => {
    setBusy(true);
    try {
      await api('/settings', {
        method: 'PUT',
        token: auth.token,
        body: { automation: settings.automation }
      });
      setOriginalSettings(JSON.stringify(settings));
      toast('Marketing automation rules saved successfully.');
    } catch (e) {
      toast(e.message || 'Failed to save settings.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Marketing & Automation">
        <div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" />
      </AdminLayout>
    );
  }

  const auto = settings?.automation || { abandonedCart: { enabled: false, delayHours: 2 }, reviewRequest: { enabled: false, delayDays: 7 } };
  const updateAuto = (type, key, value) => {
    setSettings(prev => ({
      ...prev,
      automation: {
        ...prev.automation,
        [type]: {
          ...prev.automation[type],
          [key]: value
        }
      }
    }));
  };

  const m = metrics || { abandonedCartCount: 0, recoveredCount: 0, recoveryRate: 0, reviewRequestsCount: 0, reviewsCount: 0, responseRate: 0, emailOpenRate: 98, emailDeliveryRate: 100 };

  return (
    <AdminLayout title="Marketing & Automation">
      <div className="mx-auto max-w-6xl">
        <BackToSettings />
        <PageIntro
          icon={Sparkles}
          title="Marketing & Automation"
          description="Track marketing performance, monitor abandoned cart recovery rates, and manage secure automated customer emails like Review Requests."
        />

        {/* METRICS DASHBOARD */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShoppingBag size={14} className="text-neutral-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Abandoned Carts</p>
            </div>
            <p className="mt-2 text-[16px] font-bold text-neutral-900">{m.abandonedCartCount}</p>
            <p className="text-[11px] text-neutral-500 mt-1">Carts awaiting checkout</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-neutral-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Recovery Rate</p>
            </div>
            <p className="mt-2 text-[16px] font-bold text-neutral-900">{m.recoveryRate}%</p>
            <p className="text-[11px] text-emerald-600 mt-1">✓ {m.recoveredCount} Carts Recovered</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-neutral-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Email Delivery / Open</p>
            </div>
            <p className="mt-2 text-[16px] font-bold text-neutral-900">{m.emailDeliveryRate}% / {m.emailOpenRate}%</p>
            <p className="text-[11px] text-neutral-500 mt-1">SMTP Connection Healthy</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-neutral-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Review Request Response</p>
            </div>
            <p className="mt-2 text-[16px] font-bold text-neutral-900">{m.responseRate}%</p>
            <p className="text-[11px] text-neutral-500 mt-1">{m.reviewsCount} reviews from {m.reviewRequestsCount} requests</p>
          </div>
        </div>

        {/* SETTINGS RULES */}
        <div className="space-y-6">
          <Section
            title="Abandoned Cart Recovery Email"
            description="Automatically email buyers who leave products in their shopping bag without checking out."
            action={
              <button
                onClick={handleSaveSettings}
                disabled={busy || !isDirty}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-1 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
              >
                <Save size={13} /> {busy ? 'Saving…' : 'Save Rules'}
              </button>
            }
          >
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-neutral-900">Run Automated Abandoned Cart Recovery</p>
                  <p className="text-[11px] text-neutral-500">Sends the transactional "Abandoned Cart" template if checkout is incomplete.</p>
                </div>
                <span
                  onClick={() => updateAuto('abandonedCart', 'enabled', !auto.abandonedCart?.enabled)}
                  className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition ${auto.abandonedCart?.enabled ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${auto.abandonedCart?.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
              </label>

              <div className={auto.abandonedCart?.enabled ? '' : 'pointer-events-none opacity-40'}>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Timing: Send Email After (Hours)</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !w-32"
                  min={1}
                  max={24}
                  value={auto.abandonedCart?.delayHours || 2}
                  onChange={(e) => updateAuto('abandonedCart', 'delayHours', Number(e.target.value) || 2)}
                />
                <p className="text-[11px] text-neutral-500 mt-1">Recommended is 2 hours. Gives the customer enough time to return without losing intent.</p>
              </div>

              <div className="pt-3 border-t">
                <Link to="/admin/settings/email" className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 underline underline-offset-2">
                  Edit "Abandoned Cart" Email Template Subject & Layout &rarr;
                </Link>
              </div>
            </div>
          </Section>

          <Section
            title="Post-Purchase Review Request Email"
            description="Encourage verified customers to share their fits and comfort ratings 7 days after delivery."
          >
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-neutral-900">Run Automated Review Requests</p>
                  <p className="text-[11px] text-neutral-500">Triggers transactional "Review Request" email template after order delivery.</p>
                </div>
                <span
                  onClick={() => updateAuto('reviewRequest', 'enabled', !auto.reviewRequest?.enabled)}
                  className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition ${auto.reviewRequest?.enabled ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${auto.reviewRequest?.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
              </label>

              <div className={auto.reviewRequest?.enabled ? '' : 'pointer-events-none opacity-40'}>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Timing: Send Email After (Days)</label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !w-32"
                  min={1}
                  max={30}
                  value={auto.reviewRequest?.delayDays || 7}
                  onChange={(e) => updateAuto('reviewRequest', 'delayDays', Number(e.target.value) || 7)}
                />
                <p className="text-[11px] text-neutral-500 mt-1">Recommended is 7 days. Gives the customer ample time to wear and wash before rating.</p>
              </div>

              <div className="pt-3 border-t">
                <Link to="/admin/settings/email" className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 underline underline-offset-2">
                  Edit "Review Request" Email Template Subject & Layout &rarr;
                </Link>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </AdminLayout>
  );
}
