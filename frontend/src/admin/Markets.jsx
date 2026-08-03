import { useEffect, useState } from 'react';
import { Globe, Truck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

export default function Markets() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/settings').then((d) => setS(d.settings)).catch(() => toast('Could not load settings')); }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="Markets"><div className="animate-pulse rounded-xl bg-neutral-100 h-64 w-full" /></AdminLayout>;

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
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="font-sans text-lg">Your Markets</h2>
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-100 p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 font-sans text-sm text-white">PK</span>
            <div className="flex-1">
              <p className="font-medium">Pakistan</p>
              <p className="text-xs text-neutral-500">Primary market · Pakistani Rupee (PKR ₨) · Nationwide delivery</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">Active</span>
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-neutral-500">
            <Globe size={15} className="mt-0.5 shrink-0" />
            International markets (UAE, UK, USA) and multiple currencies are coming soon. Your store is currently fully live for Pakistan.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="font-sans text-lg">Shipping & Payment</h2>
          <p className="mt-1 text-xs text-neutral-500">Ye settings checkout par foran apply hoti hain.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Shipping flat rate (PKR)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={s.shippingFlatRate} onChange={(e) => setS({ ...s, shippingFlatRate: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Free shipping above (PKR)</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={s.freeShippingThreshold} onChange={(e) => setS({ ...s, freeShippingThreshold: e.target.value })} />
            </div>
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 p-4">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-obsidian" checked={!!pm.cod}
              onChange={(e) => setS({ ...s, paymentMethods: { ...pm, cod: e.target.checked } })} />
            <span>
              <span className="flex items-center gap-2 text-sm font-medium"><Truck size={15} /> Cash on Delivery (COD)</span>
              <span className="mt-0.5 block text-xs text-neutral-500">Pakistan mein sab se popular payment method — band karna ho to uncheck karein.</span>
            </span>
          </label>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[11px] font-semibold text-white hover:bg-black mt-5">{busy ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </AdminLayout>
  );
}
