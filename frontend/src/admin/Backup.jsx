import { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Cloud, Database, Download, FileText,
  RefreshCw, Shield, Upload,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime } from '../lib/format';
import AdminLayout from './AdminLayout';

/*
 * Backup & Restore admin page.
 * Explains the 3 safety layers (GitHub / MongoDB Atlas / manual JSON),
 * lets the admin download a full JSON snapshot, and (with a strong warning)
 * upload a snapshot to restore.
 */

export default function Backup() {
  const { auth, toast } = useApp();
  const [info, setInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    api('/backup/info', { token: auth.token }).then(setInfo).catch(() => setInfo({ counts: {} }));
  }, [auth]);

  const download = async () => {
    setDownloading(true);
    try {
      const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${BASE}/api/backup/download`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veloura-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Backup downloaded');
    } catch (ex) { toast(ex.message || 'Download failed'); }
    setDownloading(false);
  };

  const restore = async (file) => {
    if (!file) return;
    if (!window.confirm(`Restore from "${file.name}"?\n\nExisting records with the same ID will be REPLACED. Users/passwords will NOT be restored. Continue?`)) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const r = await api('/backup/restore', { method: 'POST', token: auth.token, body: json });
      toast(`Restored — ${Object.entries(r.results?.restored || {}).map(([k, v]) => `${v} ${k}`).join(', ')}`);
    } catch (ex) { toast(ex.message || 'Restore failed'); }
    setRestoring(false);
  };

  const c = info?.counts || {};

  return (
    <AdminLayout title="Backup & Restore">
      {/* Safety layers explainer */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <SafetyLayer
          icon={Cloud} tone="blue"
          title="Layer 1 — GitHub"
          text="Your source code is versioned on GitHub. Every push is a full snapshot. You can restore any past commit."
        />
        <SafetyLayer
          icon={Database} tone="green"
          title="Layer 2 — MongoDB Atlas"
          text="Your live data (products, orders, customers) lives on MongoDB Atlas in Mumbai. Cluster-level snapshots run daily on paid tiers; Atlas keeps them for weeks."
        />
        <SafetyLayer
          icon={Shield} tone="neutral"
          title="Layer 3 — Manual JSON"
          text="Download a full snapshot of your database to your own computer any time. Store it on Google Drive / a USB / anywhere you trust."
        />
      </div>

      {/* Data footprint */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">What's in your database</p>
            <p className="mt-1 text-[12px] text-neutral-500">Live counts from MongoDB Atlas</p>
          </div>
          <button
            onClick={() => api('/backup/info', { token: auth.token }).then(setInfo)}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Products', v: c.products },
            { label: 'Categories', v: c.categories },
            { label: 'Orders', v: c.orders },
            { label: 'Customers', v: c.users },
            { label: 'Subscribers', v: c.subscribers },
            { label: 'Discounts', v: c.discounts },
          ].map((x) => (
            <div key={x.label} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{x.label}</p>
              <p className="mt-1 font-sans text-[22px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">{x.v ?? '—'}</p>
            </div>
          ))}
        </div>
        {info?.total > 0 && (
          <p className="mt-4 text-[11px] text-neutral-500">
            Total records: <b className="text-neutral-900">{info.total.toLocaleString()}</b>
          </p>
        )}
      </section>

      {/* Download */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-md">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Download full snapshot</p>
            <h3 className="mt-1 font-display text-xl text-neutral-900">Save your store to a JSON file</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
              One click gives you a single JSON file with everything —
              settings, categories, products, orders, subscribers, and discounts.
              Passwords are stripped for security. Do this weekly.
            </p>
          </div>
          <button
            onClick={download}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-[12px] font-semibold uppercase tracking-widest text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            <Download size={13} /> {downloading ? 'Preparing…' : 'Download backup'}
          </button>
        </div>
      </section>

      {/* Restore */}
      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700"><AlertTriangle size={16} /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-700">Danger zone — restore</p>
            <h3 className="mt-1 font-display text-xl text-neutral-900">Restore from a snapshot</h3>
            <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-neutral-700">
              Uploading a JSON backup will <b>replace</b> existing records with the same ID.
              User accounts are not restored (passwords were stripped). Only use this if you
              are recovering from a bad state.
            </p>
          </div>
        </div>
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-red-300 bg-white px-5 py-2.5 text-[12px] font-semibold text-red-700 transition hover:bg-red-100">
          <Upload size={12} />
          {restoring ? 'Restoring…' : 'Choose backup file to restore'}
          <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} disabled={restoring} />
        </label>
      </section>
    </AdminLayout>
  );
}

function SafetyLayer({ icon: Icon, tone, title, text }) {
  const map = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700' },
    green:   { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    neutral: { bg: 'bg-neutral-100', text: 'text-neutral-700' },
  };
  const t = map[tone];
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.bg} ${t.text}`}>
        <Icon size={16} strokeWidth={1.9} />
      </span>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-neutral-500">{title}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-600">{text}</p>
    </div>
  );
}
