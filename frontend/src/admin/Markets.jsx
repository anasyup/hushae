import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnSolid, ctl, MonoStatus, TableSkeleton } from './orders/orderUi';

export default function Markets() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/settings').then((d) => setS(d.settings)).catch(() => toast('Could not load settings')); }, []); // eslint-disable-line

  if (!s) {
    return (
      <AdminLayout title="Markets">
        <PageHeader title="Markets" description="Pakistan-first store configuration." />
        <TableSkeleton rows={5} />
      </AdminLayout>
    );
  }

  const pm = s.paymentMethods || {};
  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: {
        shippingFlatRate: Number(s.shippingFlatRate) || 0,
        freeShippingThreshold: Number(s.freeShippingThreshold) || 0,
        paymentMethods: { ...pm },
      } });
      toast('Markets saved');
    } catch (ex) { toast(ex.message || 'Could not save'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Markets">
      <PageHeader
        title="Markets"
        description="Pakistan-first store configuration."
        actions={<button type="button" onClick={save} disabled={busy} className={btnSolid}>{busy ? 'Saving…' : 'Save'}</button>}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Market</p>
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-[#EAEAEA] py-6">
          <div>
            <p className="text-[13px] text-black">Pakistan</p>
            <p className="mt-1 text-[12px] text-[#AAAAAA]">Primary market · Pakistani Rupee (PKR ₨) · Nationwide delivery</p>
          </div>
          <MonoStatus label="ACTIVE" />
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-[#AAAAAA]">
          International markets (UAE, UK, USA) and multiple currencies are coming soon. Your store is currently fully live for Pakistan.
        </p>
      </section>

      <section>
        <p className="adm-index">02 — Shipping & payment</p>
        <p className="mb-4 text-[12px] text-[#AAAAAA]">Ye settings checkout par foran apply hoti hain.</p>
        <div className="grid gap-4 border-y border-[#EAEAEA] py-6 sm:grid-cols-2">
          <div>
            <label className="adm-label mb-1.5 block">Shipping flat rate (PKR)</label>
            <input className={ctl} type="number" min="0" value={s.shippingFlatRate} onChange={(e) => setS({ ...s, shippingFlatRate: e.target.value })} />
          </div>
          <div>
            <label className="adm-label mb-1.5 block">Free shipping above (PKR)</label>
            <input className={ctl} type="number" min="0" value={s.freeShippingThreshold} onChange={(e) => setS({ ...s, freeShippingThreshold: e.target.value })} />
          </div>
          <label className="flex cursor-pointer items-start justify-between gap-4 sm:col-span-2">
            <span>
              <span className="block text-[13px] text-black">Cash on Delivery (COD)</span>
              <span className="mt-0.5 block text-[12px] text-[#AAAAAA]">Pakistan mein sab se popular payment method — band karna ho to uncheck karein.</span>
            </span>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-white"
              checked={!!pm.cod}
              onChange={(e) => setS({ ...s, paymentMethods: { ...pm, cod: e.target.checked } })}
            />
          </label>
        </div>
      </section>
    </AdminLayout>
  );
}
