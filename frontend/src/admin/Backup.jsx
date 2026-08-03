import { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Cloud, Database, Download, FileText,
  RefreshCw, Shield, Upload, FileSpreadsheet, Calendar, CalendarDays
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
  
  // CSV export state
  const [orderStatus, setOrderStatus] = useState('');
  const [orderStart, setOrderStart] = useState('');
  const [orderEnd, setOrderEnd] = useState('');
  const [exportBusy, setExportBusy] = useState({ orders: false, customers: false, products: false, reviews: false });

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
      a.download = `hushae-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Full database backup JSON downloaded successfully.');
    } catch (ex) { toast(ex.message || 'Download failed'); }
    setDownloading(false);
  };

  const handleExportCSV = async (type) => {
    setExportBusy(prev => ({ ...prev, [type]: true }));
    try {
      const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      let queryStr = '';
      if (type === 'orders') {
        const params = [];
        if (orderStatus) params.push(`status=${encodeURIComponent(orderStatus)}`);
        if (orderStart) params.push(`start=${encodeURIComponent(orderStart)}`);
        if (orderEnd) params.push(`end=${encodeURIComponent(orderEnd)}`);
        if (params.length) queryStr = `?${params.join('&')}`;
      }

      const res = await fetch(`${BASE}/api/backup/export/${type}${queryStr}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) throw new Error(`Export of ${type} failed.`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(`${type.toUpperCase()} CSV Export downloaded successfully.`);
    } catch (ex) {
      toast(ex.message || `Export of ${type} failed.`);
    } finally {
      setExportBusy(prev => ({ ...prev, [type]: false }));
    }
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
    <AdminLayout title="Data Management & Exports">
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

      {/* CSV Data Export Panel */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 mb-2">CSV Data Exports</p>
        <p className="text-[12px] text-neutral-500 mb-6">Download tailored datasets for bookkeeping, accounting, or custom analytics.</p>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Order export card */}
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 bg-neutral-900 text-white rounded-lg"><FileSpreadsheet size={16} /></span>
              <p className="text-sm font-semibold text-neutral-900">Export Orders to CSV</p>
            </div>
            
            {/* Filters */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase">Fulfillment Status</label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="input !py-1.5 !text-xs mt-1 bg-white"
                >
                  <option value="">All Orders</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-neutral-500 uppercase">From Date</label>
                  <input
                    type="date"
                    value={orderStart}
                    onChange={(e) => setOrderStart(e.target.value)}
                    className="input !py-1.5 !text-xs mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-neutral-500 uppercase">To Date</label>
                  <input
                    type="date"
                    value={orderEnd}
                    onChange={(e) => setOrderEnd(e.target.value)}
                    className="input !py-1.5 !text-xs mt-1 bg-white"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => handleExportCSV('orders')}
              disabled={exportBusy.orders}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-45"
            >
              <Download size={13} /> {exportBusy.orders ? 'Exporting…' : 'Export Orders CSV'}
            </button>
          </div>

          {/* Quick Exports Card */}
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-5 space-y-4 flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900 mb-2">Quick Standard Exports</p>
              <p className="text-xs text-neutral-500 mb-4">One-click downloads for customers, full product catalogs, and published user reviews.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                onClick={() => handleExportCSV('customers')}
                disabled={exportBusy.customers}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-45"
              >
                <Download size={12} /> Customers
              </button>
              <button
                onClick={() => handleExportCSV('products')}
                disabled={exportBusy.products}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-45"
              >
                <Download size={12} /> Catalog
              </button>
              <button
                onClick={() => handleExportCSV('reviews')}
                disabled={exportBusy.reviews}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-45"
              >
                <Download size={12} /> Reviews
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Data footprint */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
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
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
          {[
            { label: 'Products', v: c.products },
            { label: 'Categories', v: c.categories },
            { label: 'Orders', v: c.orders },
            { label: 'Customers', v: c.users },
            { label: 'Subscribers', v: c.subscribers },
            { label: 'Discounts', v: c.discounts },
            { label: 'Audit Logs', v: c.auditLogs },
          ].map((x) => (
            <div key={x.label} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{x.label}</p>
              <p className="mt-1 font-sans text-[12px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">{x.v ?? '—'}</p>
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
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-md">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Download full JSON snapshot</p>
            <h3 className="mt-1 font-sans text-xl text-neutral-900">Save your store to a JSON file</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
              One click gives you a single JSON file with everything —
              settings, categories, products, orders, subscribers, audit logs, and discounts.
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
      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-6 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700"><AlertTriangle size={16} /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-700">Danger zone — restore</p>
            <h3 className="mt-1 font-sans text-xl text-neutral-900">Restore from a snapshot</h3>
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
