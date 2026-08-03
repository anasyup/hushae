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

  const statusPill = live === null
    ? <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-[12px] font-semibold text-neutral-500">Checking…</span>
    : live
      ? <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Store Live</span>
      : <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-[12px] font-semibold text-red-800"><span className="h-1.5 w-1.5 rounded-full bg-red-600" /> Offline</span>;

  const ACTIONS = [
    ['Edit Theme', 'Sections, images, text, colours', Palette, '/admin/theme'],
    ['Announcement Bar', 'Top strip on/off aur message', Megaphone, '/admin/content'],
    ['Coupons', 'Create discount codes', BadgePercent, '/admin/discounts'],
    ['Shipping & COD', 'Rates aur free-shipping limit', Truck, '/admin/markets'],
    ['WhatsApp & Social', 'Chat button aur links', MessageCircle, '/admin/apps'],
    ['Analytics', 'Sales charts dekhein', BarChart3, '/admin/analytics'],
  ];

  return (
    <AdminLayout title="Online Store">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">{statusPill}{lock.enabled && <span className="flex items-center gap-1.5 rounded-full bg-[#f6dfc4] px-3 py-1 text-[12px] font-semibold text-[#9a5b13]"><Lock size={11} /> Password protected</span>}</div>
        <div className="flex gap-2">
          <button onClick={copyUrl} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50 !py-2"><Copy size={13} /> {copied ? 'Copied!' : 'Copy link'}</button>
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black !py-2"><ExternalLink size={13} /> View store</a>
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-100/40 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e26d6d]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e5b45c]" /><span className="h-2.5 w-2.5 rounded-full bg-[#7fbf7f]" />
          </span>
          <span className="mx-auto flex w-full max-w-md items-center justify-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] text-neutral-500"><Globe size={11} /> {storeUrl.replace(/^https?:\/\//, '')}</span>
          <span className="w-10" />
        </div>
        <div className="relative flex items-end justify-center gap-6 bg-[#ecebe8] px-6 pt-6">
          <div className="hidden h-[300px] w-full max-w-[560px] overflow-hidden rounded-t-xl border border-b-0 border-neutral-200 bg-white shadow-md md:block">
            <iframe title="Desktop preview" src="/" loading="lazy" className="pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0" tabIndex="-1" />
          </div>
          <div className="h-[280px] w-[140px] shrink-0 overflow-hidden rounded-t-[1.4rem] border-[7px] border-b-0 border-obsidian bg-white shadow-md">
            <iframe title="Mobile preview" src="/" loading="lazy" className="pointer-events-none h-[560px] w-[280px] origin-top-left scale-[0.45] border-0" tabIndex="-1" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Current theme */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white"><Store size={20} /></span>
              <div>
                <p className="font-sans text-lg">HUSHAE Signature</p>
                <p className="text-xs text-neutral-500">Current theme · v1.0 · Active</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">Live</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/admin/theme" className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black"><Pencil size={14} /> Edit theme</Link>
            <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50"><ExternalLink size={13} /> View store</a>
          </div>
        </div>

        {/* Password lock */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${lock.enabled ? 'bg-[#9a5b13] text-white' : 'bg-neutral-100 text-neutral-500'}`}><Lock size={18} /></span>
              <div>
                <p className="font-sans text-lg">Password Protection</p>
                <p className="text-xs text-neutral-500">{lock.enabled ? 'Store abhi sirf password se khulta hai' : 'Store sab ke liye open hai'}</p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={lock.enabled} onChange={(e) => setLock('enabled', e.target.checked)} />
              <span className="h-6 w-11 rounded-full bg-neutral-100 transition peer-checked:bg-neutral-900 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${lock.enabled ? '' : 'pointer-events-none opacity-40'}`}>
            <div className="sm:col-span-2"><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Password</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={lock.password} onChange={(e) => setLock('password', e.target.value)} placeholder="e.g. hushae-2026" /></div>
            <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Heading (lock screen)</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={lock.heading || ''} onChange={(e) => setLock('heading', e.target.value)} placeholder="HUSHAE is opening soon" /></div>
            <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Message</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={lock.message || ''} onChange={(e) => setLock('message', e.target.value)} /></div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={saveLock} disabled={busy || !s} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black">{busy ? 'Saving…' : 'Save'}</button>
            {lock.enabled && <p className="flex items-center gap-1 text-[12px] text-neutral-500"><Check size={12} className="text-emerald-700" /> Save ke foran baad sab visitors se password manga jayega</p>}
          </div>
        </div>
      </div>

      {/* Customize */}
      <h2 className="mt-8 font-sans text-lg">Customize</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        {ACTIONS.map(([label, desc, Icon, to]) => (
          <Link key={label} to={to} className="rounded-2xl border border-neutral-200 bg-white group p-4 transition hover:border-obsidian/30 hover:shadow-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900/70 transition group-hover:bg-neutral-900 group-hover:text-white"><Icon size={16} /></span>
            <p className="mt-3 text-sm font-semibold">{label}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">{desc}</p>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
