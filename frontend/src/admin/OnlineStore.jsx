import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, ctl, MonoStatus, TableSkeleton } from './orders/orderUi';

export default function OnlineStore() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [live, setLive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const storeUrl = window.location.origin;

  useEffect(() => {
    api('/settings/admin', { token: auth.token }).then((d) => setS(d.settings)).catch(() => {});
    api('/health').then(() => setLive(true)).catch(() => setLive(false));
  }, []);

  const lock = s?.storefrontLock ?? { enabled: false, password: '', heading: '', message: '' };
  const setLock = (k, v) => setS((x) => ({ ...x, storefrontLock: { ...lock, [k]: v } }));

  const saveLock = async () => {
    if (lock.enabled && !lock.password.trim()) { toast('Pehle password set, phir lock on karein'); return; }
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { storefrontLock: { ...lock, password: lock.password.trim() } } });
      toast(lock.enabled ? 'Store lock is ON — visitors will need a password' : 'Store lock is OFF — the store is public');
    } catch (ex) { toast(ex.message || 'Could not save'); }
    setBusy(false);
  };

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(storeUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const ACTIONS = [
    ['Edit Theme', 'Sections, images, text, colours', '/admin/theme'],
    ['Announcement Bar', 'Top strip on/off aur message', '/admin/content'],
    ['Coupons', 'Create discount codes', '/admin/discounts'],
    ['Shipping & COD', 'Rates aur free-shipping limit', '/admin/markets'],
    ['WhatsApp & Social', 'Chat button aur links', '/admin/apps'],
    ['Analytics', 'Sales charts dekhein', '/admin/analytics'],
  ];

  return (
    <AdminLayout title="Online Store">
      <PageHeader
        title="Online store"
        description="Manage your storefront configuration."
        actions={(
          <>
            <button type="button" onClick={copyUrl} className={btnGhost}>
              <Copy size={12} /> {copied ? 'Copied' : 'Copy link'}
            </button>
            <a href="/" target="_blank" rel="noreferrer" className={btnSolid}>
              <ExternalLink size={12} /> View store
            </a>
          </>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Store status</p>
        <div className="adm-divide-x grid grid-cols-1 border-y border-[#EAEAEA] sm:grid-cols-3">
          <div className="px-5 py-6">
            <p className="adm-label">Availability</p>
            <div className="mt-3">
              {live === null
                ? <MonoStatus label="CHECKING" dim />
                : live
                  ? <MonoStatus label="LIVE" />
                  : <MonoStatus label="OFFLINE" dim />}
            </div>
          </div>
          <div className="px-5 py-6">
            <p className="adm-label">Access</p>
            <div className="mt-3">
              <MonoStatus label={lock.enabled ? 'PASSWORD PROTECTED' : 'PUBLIC'} dim={lock.enabled} />
            </div>
          </div>
          <div className="px-5 py-6">
            <p className="adm-label">Address</p>
            <p className="mt-3 truncate text-[13px] text-[#555555]">{storeUrl.replace(/^https?:\/\//, '')}</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Preview</p>
        <div className="overflow-hidden border-y border-[#EAEAEA]">
          <div className="flex items-center gap-3 border-b border-[#EAEAEA] px-4 py-2.5">
            <span className="flex gap-1.5" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-white/25" />
              <span className="h-2 w-2 rounded-full bg-[#EFEFEF]" />
              <span className="h-2 w-2 rounded-full bg-[#F5F5F5]" />
            </span>
            <span className="mx-auto truncate text-[11px] uppercase tracking-[0.14em] text-[#AAAAAA]">
              {storeUrl.replace(/^https?:\/\//, '')}
            </span>
          </div>
          <div className="relative flex items-end justify-center gap-6 bg-black px-6 pt-6">
            <div className="hidden h-[300px] w-full max-w-[560px] overflow-hidden border border-b-0 border-[#EAEAEA] bg-[#0A0A0A] md:block">
              <iframe title="Desktop preview" src="/" loading="lazy" className="pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0" tabIndex="-1" />
            </div>
            <div className="h-[280px] w-[140px] shrink-0 overflow-hidden border-[6px] border-b-0 border-[#DCDCDC] bg-[#0A0A0A]">
              <iframe title="Mobile preview" src="/" loading="lazy" className="pointer-events-none h-[560px] w-[280px] origin-top-left scale-[0.45] border-0" tabIndex="-1" />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">03 — Store management</p>
        {!s ? (
          <TableSkeleton rows={4} />
        ) : (
          <div className="border-y border-[#EAEAEA] py-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] text-black">Password protection</p>
                <p className="mt-1 text-[12px] text-[#AAAAAA]">
                  {lock.enabled ? 'Store abhi sirf password se khulta hai' : 'Store sab ke liye open hai'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!lock.enabled}
                onClick={() => setLock('enabled', !lock.enabled)}
                className={`relative h-5 w-9 shrink-0 rounded-full ${lock.enabled ? 'bg-white' : 'bg-[#EFEFEF]'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${lock.enabled ? 'left-[18px] bg-black' : 'left-0.5 bg-white'}`} />
              </button>
            </div>
            <div className={`grid gap-4 sm:grid-cols-2 ${lock.enabled ? '' : 'pointer-events-none opacity-35'}`}>
              <div className="sm:col-span-2">
                <label className="adm-label mb-1.5 block">Password</label>
                <input className={ctl} value={lock.password} onChange={(e) => setLock('password', e.target.value)} placeholder="e.g. hushae-2026" />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Heading (lock screen)</label>
                <input className={ctl} value={lock.heading || ''} onChange={(e) => setLock('heading', e.target.value)} placeholder="HUSHAE is opening soon" />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Message</label>
                <input className={ctl} value={lock.message || ''} onChange={(e) => setLock('message', e.target.value)} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={saveLock} disabled={busy || !s} className={btnSolid}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              {lock.enabled && (
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#AAAAAA]">
                  Save ke foran baad sab visitors se password manga jayega
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section>
        <p className="adm-index">04 — Quick links</p>
        <div className="divide-y divide-[#EAEAEA] border-y border-[#EAEAEA]">
          {ACTIONS.map(([label, hint, to]) => (
            <Link key={to} to={to} className="flex items-center justify-between gap-4 py-4 adm-row-hover">
              <span>
                <span className="block text-[13px] text-black">{label}</span>
                <span className="mt-0.5 block text-[12px] text-[#AAAAAA]">{hint}</span>
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-[#AAAAAA]">Open →</span>
            </Link>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
