import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdConfirm, TableSkeleton,
  ctl, btnGhost, btnSolid,
} from './settings/chrome';

export default function Backup() {
  const { auth, toast } = useApp();
  const [info, setInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [orderStatus, setOrderStatus] = useState('');
  const [orderStart, setOrderStart] = useState('');
  const [orderEnd, setOrderEnd] = useState('');
  const [exportBusy, setExportBusy] = useState({ orders: false, customers: false, products: false, reviews: false });
  const [pendingFile, setPendingFile] = useState(null);

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
    setExportBusy((prev) => ({ ...prev, [type]: true }));
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
      setExportBusy((prev) => ({ ...prev, [type]: false }));
    }
  };

  const restore = async (file) => {
    if (!file) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const r = await api('/backup/restore', { method: 'POST', token: auth.token, body: json });
      toast(`Restored — ${Object.entries(r.results?.restored || {}).map(([k, v]) => `${v} ${k}`).join(', ')}`);
    } catch (ex) { toast(ex.message || 'Restore failed'); }
    setRestoring(false);
    setPendingFile(null);
  };

  const c = info?.counts || {};

  return (
    <AdminLayout title="Backup & Export">
      <PageHeader
        title="Backup & Export"
        description="Snapshots, restore and CSV exports. Data integrity behaviour is unchanged."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Backup' }]}
      />

      <EdSection index={1} title="Safety layers">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['Layer 1 — GitHub', 'Source code is versioned on GitHub. Every push is a snapshot. Any past commit can be restored.'],
            ['Layer 2 — MongoDB Atlas', 'Live data lives on MongoDB Atlas in Mumbai. Cluster snapshots run daily on paid tiers.'],
            ['Layer 3 — Manual JSON', 'Download a full snapshot to your own computer. Store it anywhere you trust.'],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="text-[13px] text-black">{t}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#AAAAAA]">{d}</p>
            </div>
          ))}
        </div>
      </EdSection>

      <EdSection index={2} title="CSV exports" description="Tailored datasets for bookkeeping and analytics.">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="mb-3 text-[13px] text-black">Orders</p>
            <div className="space-y-3">
              <div>
                <label className="adm-label mb-1.5 block">Fulfillment status</label>
                <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className={ctl}>
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
                  <label className="adm-label mb-1.5 block">From date</label>
                  <input type="date" value={orderStart} onChange={(e) => setOrderStart(e.target.value)} className={ctl} />
                </div>
                <div>
                  <label className="adm-label mb-1.5 block">To date</label>
                  <input type="date" value={orderEnd} onChange={(e) => setOrderEnd(e.target.value)} className={ctl} />
                </div>
              </div>
              <button type="button" onClick={() => handleExportCSV('orders')} disabled={exportBusy.orders} className={btnSolid}>
                {exportBusy.orders ? 'Exporting…' : 'Export orders CSV'}
              </button>
            </div>
          </div>
          <div>
            <p className="mb-3 text-[13px] text-black">Quick exports</p>
            <p className="mb-4 text-[12px] text-[#AAAAAA]">One-click downloads for customers, catalogue and reviews.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleExportCSV('customers')} disabled={exportBusy.customers} className={btnGhost}>{exportBusy.customers ? '…' : 'Customers'}</button>
              <button type="button" onClick={() => handleExportCSV('products')} disabled={exportBusy.products} className={btnGhost}>{exportBusy.products ? '…' : 'Catalog'}</button>
              <button type="button" onClick={() => handleExportCSV('reviews')} disabled={exportBusy.reviews} className={btnGhost}>{exportBusy.reviews ? '…' : 'Reviews'}</button>
            </div>
          </div>
        </div>
      </EdSection>

      <EdSection
        index={3}
        title="Database footprint"
        description="Live counts from MongoDB Atlas"
        action={<button type="button" onClick={() => api('/backup/info', { token: auth.token }).then(setInfo)} className={btnGhost}>Refresh</button>}
      >
        {!info ? (
          <TableSkeleton rows={2} />
        ) : (
          <>
            <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] sm:grid-cols-4 lg:grid-cols-7">
              {[
                ['Products', c.products],
                ['Categories', c.categories],
                ['Orders', c.orders],
                ['Customers', c.users],
                ['Subscribers', c.subscribers],
                ['Discounts', c.discounts],
                ['Audit Logs', c.auditLogs],
              ].map(([label, v]) => (
                <div key={label} className="px-4 py-5">
                  <p className="adm-label">{label}</p>
                  <p className="adm-metric mt-2 text-[22px] text-black">{v ?? '—'}</p>
                </div>
              ))}
            </div>
            {info?.total > 0 && (
              <p className="mt-4 text-[12px] text-[#AAAAAA]">Total records: <span className="text-black">{info.total.toLocaleString()}</span></p>
            )}
          </>
        )}
      </EdSection>

      <EdSection
        index={4}
        title="Download snapshot"
        description="One JSON file with settings, categories, products, orders, subscribers, audit logs and discounts. Passwords are stripped."
        action={
          <button type="button" onClick={download} disabled={downloading} className={btnSolid}>
            {downloading ? 'Preparing…' : 'Download backup'}
          </button>
        }
      >
        <p className="text-[12px] leading-relaxed text-[#AAAAAA]">Do this weekly. Store the file off this server.</p>
      </EdSection>

      <EdSection index={5} title="Restore" description="Uploading a JSON backup will replace existing records with the same ID. User accounts are not restored.">
        <label className={`${btnGhost} cursor-pointer`}>
          {restoring ? 'Restoring…' : 'Choose backup file'}
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            disabled={restoring}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) setPendingFile(file);
            }}
          />
        </label>
      </EdSection>

      <EdConfirm
        open={!!pendingFile}
        title="Restore from snapshot"
        body={pendingFile ? `Restore from "${pendingFile.name}"? Existing records with the same ID will be replaced. Users and passwords will not be restored.` : ''}
        confirmLabel="Restore"
        busy={restoring}
        onCancel={() => setPendingFile(null)}
        onConfirm={() => restore(pendingFile)}
      />
    </AdminLayout>
  );
}
