import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgePercent, BarChart3, Check, Copy, ExternalLink, Globe, Lock, Megaphone,
  MessageCircle, Palette, Pencil, Store, Truck,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

export default function OnlineStore() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [live, setLive] = useState(null); // null=checking, true/false
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const storeUrl = window.location.origin;

  useEffect(() => {
    api('/settings').then((d) => setS(d.settings)).catch(() => {});
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

  const statusPill = live === null
    ? <span className="flex items-center gap-1.5 rounded-full bg-satin px-3 py-1 text-[11px] font-semibold text-ash">Checking…</span>
    : live
      ? <span className="flex items-center gap-1.5 rounded-full bg-sage/25 px-3 py-1 text-[11px] font-semibold text-sagedeep"><span className="h-1.5 w-1.5 rounded-full bg-sagedeep" /> Store Live</span>
      : <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-[11px] font-semibold text-red-800"><span className="h-1.5 w-1.5 rounded-full bg-red-600" /> Offline</span>;

  const ACTIONS = [
    ['Edit Theme', 'Hero, images aur text', Palette, '/admin/content'],
    ['Announcement Bar', 'Top strip on/off aur message', Megaphone, '/admin/content'],
    ['Coupons', 'Create discount codes', BadgePercent, '/admin/discounts'],
    ['Shipping & COD', 'Rates aur free-shipping limit', Truck, '/admin/markets'],
    ['WhatsApp & Social', 'Chat button aur links', MessageCircle, '/admin/apps'],
    ['Analytics', 'Sales charts dekhein', BarChart3, '/admin/analytics'],
  ];

  return (
    <AdminLayout title="Online Store">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">{statusPill}{lock.enabled && <span className="flex items-center gap-1.5 rounded-full bg-[#f6dfc4] px-3 py-1 text-[11px] font-semibold text-[#9a5b13]"><Lock size={11} /> Password protected</span>}</div>
        <div className="flex gap-2">
          <button onClick={copyUrl} className="btn-outline !py-2"><Copy size={13} /> {copied ? 'Copied!' : 'Copy link'}</button>
          <a href="/" target="_blank" rel="noreferrer" className="btn-primary !py-2"><ExternalLink size={13} /> View store</a>
        </div>
      </div>

      {/* Live preview */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line bg-satin/40 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e26d6d]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e5b45c]" /><span className="h-2.5 w-2.5 rounded-full bg-[#7fbf7f]" />
          </span>
          <span className="mx-auto flex w-full max-w-md items-center justify-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] text-ash"><Globe size={11} /> {storeUrl.replace(/^https?:\/\//, '')}</span>
          <span className="w-10" />
        </div>
        <div className="relative flex items-end justify-center gap-6 bg-[#ecebe8] px-6 pt-6">
          <div className="hidden h-[300px] w-full max-w-[560px] overflow-hidden rounded-t-xl border border-b-0 border-line bg-white shadow-soft md:block">
            <iframe title="Desktop preview" src="/" loading="lazy" className="pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0" tabIndex="-1" />
          </div>
          <div className="h-[280px] w-[140px] shrink-0 overflow-hidden rounded-t-[1.4rem] border-[7px] border-b-0 border-obsidian bg-white shadow-soft">
            <iframe title="Mobile preview" src="/" loading="lazy" className="pointer-events-none h-[560px] w-[280px] origin-top-left scale-[0.45] border-0" tabIndex="-1" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Current theme */}
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-obsidian text-alabaster"><Store size={20} /></span>
              <div>
                <p className="font-sans text-lg">HUSHAE Signature</p>
                <p className="text-xs text-ash">Current theme · v1.0 · Active</p>
              </div>
            </div>
            <span className="rounded-full bg-sage/25 px-3 py-1 text-[11px] font-semibold text-sagedeep">Live</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/admin/content" className="btn-primary"><Pencil size={14} /> Edit theme</Link>
            <a href="/" target="_blank" rel="noreferrer" className="btn-outline"><ExternalLink size={13} /> View store</a>
          </div>
        </div>

        {/* Password lock */}
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${lock.enabled ? 'bg-[#9a5b13] text-white' : 'bg-satin text-ash'}`}><Lock size={18} /></span>
              <div>
                <p className="font-sans text-lg">Password Protection</p>
                <p className="text-xs text-ash">{lock.enabled ? 'Store abhi sirf password se khulta hai' : 'Store sab ke liye open hai'}</p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={lock.enabled} onChange={(e) => setLock('enabled', e.target.checked)} />
              <span className="h-6 w-11 rounded-full bg-satin transition peer-checked:bg-obsidian after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${lock.enabled ? '' : 'pointer-events-none opacity-40'}`}>
            <div className="sm:col-span-2"><label className="label">Password</label><input className="input" value={lock.password} onChange={(e) => setLock('password', e.target.value)} placeholder="e.g. hushae-2026" /></div>
            <div><label className="label">Heading (lock screen)</label><input className="input" value={lock.heading || ''} onChange={(e) => setLock('heading', e.target.value)} placeholder="HUSHAE is opening soon" /></div>
            <div><label className="label">Message</label><input className="input" value={lock.message || ''} onChange={(e) => setLock('message', e.target.value)} /></div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={saveLock} disabled={busy || !s} className="btn-primary">{busy ? 'Saving…' : 'Save'}</button>
            {lock.enabled && <p className="flex items-center gap-1 text-[11px] text-ash"><Check size={12} className="text-sagedeep" /> Save ke foran baad sab visitors se password manga jayega</p>}
          </div>
        </div>
      </div>

      {/* Customize */}
      <h2 className="mt-8 font-sans text-lg">Customize</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        {ACTIONS.map(([label, desc, Icon, to]) => (
          <Link key={label} to={to} className="card group p-4 transition hover:border-obsidian/30 hover:shadow-soft">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-satin text-obsidian/70 transition group-hover:bg-obsidian group-hover:text-alabaster"><Icon size={16} /></span>
            <p className="mt-3 text-sm font-semibold">{label}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ash">{desc}</p>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
