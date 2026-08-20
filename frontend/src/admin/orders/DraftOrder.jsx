import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, Loader2, Minus, Package, Plus, Search, ShoppingBag, Trash2, User,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import AdminLayout from '../AdminLayout';
import { pkr } from '../../lib/format';

/* ============================================================================
 * ADMIN → ORDERS → CREATE ORDER (Draft / Phone order)
 *
 * Shopify's "Create order": the merchant builds the order for a customer who
 * ordered by phone or WhatsApp. The server prices everything from the DB — the
 * admin only picks products and, optionally, types a courtesy discount.
 *
 * Flow: 1) customer (search existing or enter fresh) → 2) add products →
 *        3) shipping + payment + optional discount → 4) Create.
 * ========================================================================== */

const inputCls = 'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-neutral-900';
const labelCls = 'mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500';
const cardCls = 'rounded-2xl border border-neutral-200 bg-white p-5';

export default function DraftOrder() {
  const { auth, toast, settings } = useApp();
  const nav = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [cusQ, setCusQ] = useState('');
  const [cusOpen, setCusOpen] = useState(false);
  const [picked, setPicked] = useState(null); // selected existing customer

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '', province: '', postalCode: '' });
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);

  const [prodQ, setProdQ] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [prodSearching, setProdSearching] = useState(false);
  const [pickSize, setPickSize] = useState({});
  const [pickColor, setPickColor] = useState({});
  const [pickQty, setPickQty] = useState({});

  const [lines, setLines] = useState([]); // { product, name, image, price, size, color, quantity, lineTotal }
  const [shipMethod, setShipMethod] = useState('standard');
  const [payMethod, setPayMethod] = useState('COD');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const cusRef = useRef(null);

  /* ── Load customers + locations once ─────────────────────────────────── */
  useEffect(() => {
    api('/admin/customers', { token: auth?.token })
      .then((d) => setCustomers(d.customers || []))
      .catch(() => {});
    api('/locations').then((d) => setProvinces(d.provinces || [])).catch(() => {});
  }, [auth?.token]);

  const onProvince = async (p) => {
    setForm((f) => ({ ...f, province: p, city: '' }));
    setCities([]);
    if (!p) return;
    try { const d = await api(`/locations/${encodeURIComponent(p)}/cities`); setCities(d.cities || []); } catch { setCities([]); }
  };

  const filteredCustomers = useMemo(() => {
    const q = cusQ.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [customers, cusQ]);

  const pickCustomer = (c) => {
    setPicked(c);
    setForm({ name: c.name || '', phone: c.phone || '', email: c.email || '', address: '', city: '', province: '', postalCode: '' });
    setCusOpen(false);
    setCusQ('');
  };

  const clearCustomer = () => {
    setPicked(null);
    setForm({ name: '', phone: '', email: '', address: '', city: '', province: '', postalCode: '' });
  };

  /* ── Product search ──────────────────────────────────────────────────── */
  const searchProducts = async (q) => {
    if (!q.trim()) { setProdResults([]); return; }
    setProdSearching(true);
    try {
      const d = await api(`/products?q=${encodeURIComponent(q.trim())}&limit=8`);
      setProdResults(d.products || []);
    } catch { setProdResults([]); }
    setProdSearching(false);
  };

  const addLine = (p) => {
    const size = pickSize[p._id] || p.sizes?.[0] || '';
    const color = pickColor[p._id] || p.colors?.[0]?.name || '';
    const qty = Math.max(1, parseInt(pickQty[p._id] || '1', 10) || 1);
    setLines((ls) => {
      const existing = ls.find((l) => l.product === p._id && l.size === size && l.color === color);
      if (existing) {
        return ls.map((l) => l.product === p._id && l.size === size && l.color === color
          ? { ...l, quantity: l.quantity + qty, lineTotal: (l.quantity + qty) * l.price }
          : l);
      }
      return [...ls, { product: p._id, name: p.name, image: p.images?.[0]?.url || '', price: p.price, size, color, quantity: qty, lineTotal: p.price * qty }];
    });
    setProdQ('');
    setProdResults([]);
  };

  const changeQty = (i, qty) => {
    const n = Math.max(1, parseInt(qty || '1', 10) || 1);
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, quantity: n, lineTotal: n * l.price } : l)));
  };

  /* ── Totals ──────────────────────────────────────────────────────────── */
  const shipOptions = useMemo(() => (settings?.checkout?.shippingMethods || []).filter((m) => m.enabled), [settings]);
  const payOptions = useMemo(() => {
    const list = settings?.checkout?.paymentList || [];
    return list.length
      ? list.filter((m) => m.enabled && !m.comingSoon).map((m) => m.id)
      : (settings?.paymentMethods ? ['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer'].filter((m) => settings.paymentMethods[{ COD: 'cod', JazzCash: 'jazzcash', EasyPaisa: 'easypaisa', 'Bank Transfer': 'bank' }[m]]) : ['COD']);
  }, [settings]);

  useEffect(() => {
    if (!shipOptions.length) return;
    if (!shipOptions.some((m) => m.id === shipMethod)) setShipMethod(shipOptions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipOptions]);

  useEffect(() => {
    if (payOptions.length && !payOptions.includes(payMethod)) setPayMethod(payOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payOptions]);

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const chosenShip = shipOptions.find((m) => m.id === shipMethod);
  const free = subtotal >= (settings?.freeShippingThreshold || 0);
  const shippingCharge = chosenShip
    ? (chosenShip.freeEligible !== false && free ? 0 : Number(chosenShip.rate) || 0)
    : (free ? 0 : settings?.shippingFlatRate || 0);
  const taxPercent = Number(settings?.cart?.taxPercent) || 0;
  const tax = taxPercent > 0 ? Math.round((subtotal * taxPercent) / 100) : 0;
  const discountVal = Math.min(Math.max(0, Number(discount) || 0), subtotal);
  const total = Math.max(0, subtotal - discountVal + shippingCharge + tax);

  const create = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim() || !form.province.trim() || !form.postalCode.trim()) {
      toast('Fill the customer name, phone, address, city, province and postal code');
      return;
    }
    if (lines.length === 0) { toast('Add at least one product'); return; }
    setCreating(true);
    try {
      const d = await api('/orders/manage', {
        method: 'POST',
        token: auth?.token,
        body: {
          customerInfo: { ...form, userId: picked?.id || null },
          items: lines.map((l) => ({ product: l.product, size: l.size, color: l.color, quantity: l.quantity })),
          paymentMethod: payMethod,
          shippingMethod: shipMethod,
          manualDiscount: discountVal,
          notes,
        },
      });
      toast(`Order ${d.order.orderNumber} created`);
      nav(`/admin/orders/${d.order._id}`);
    } catch (ex) {
      toast(ex.message || 'Could not create the order');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout title="Create order">
      <div className="mb-5 flex items-center justify-between">
        <button onClick={() => nav('/admin/orders')} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 transition hover:text-neutral-900">
          <ArrowLeft size={14} /> All orders
        </button>
        <button
          onClick={create}
          disabled={creating}
          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-60"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />} Create order
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* ── Customer ── */}
          <div className={cardCls}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-[14px] font-bold text-neutral-900"><User size={15} /> Customer</h3>
              {picked && (
                <button onClick={clearCustomer} className="text-[12px] font-semibold text-neutral-400 hover:text-neutral-700">Clear customer</button>
              )}
            </div>

            {!picked && (
              <div className="relative mb-4" ref={cusRef}>
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  className={`${inputCls} pl-9`}
                  placeholder="Search existing customer by name, phone or email…"
                  value={cusQ}
                  onChange={(e) => { setCusQ(e.target.value); setCusOpen(true); }}
                  onFocus={() => setCusOpen(true)}
                />
                {cusOpen && filteredCustomers.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
                    {filteredCustomers.map((c) => (
                      <button key={c.id} onClick={() => pickCustomer(c)} className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition hover:bg-neutral-50">
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-neutral-900">{c.name}</span>
                          <span className="block truncate text-[12px] text-neutral-400">{c.phone} · {c.email || 'no email'}</span>
                        </span>
                        <span className="shrink-0 text-[11px] font-medium text-neutral-400">{c.orders} orders</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Full name *</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Customer name" />
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="03XX-XXXXXXX" />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="optional — for the receipt" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address *</label>
                <input className={inputCls} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="House, street, area" />
              </div>
              <div>
                <label className={labelCls}>Province *</label>
                <select className={inputCls} value={form.province} onChange={(e) => onProvince(e.target.value)}>
                  <option value="">Select province</option>
                  {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>City *</label>
                <select className={inputCls} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} disabled={!form.province}>
                  <option value="">Select city</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Postal code *</label>
                <input className={inputCls} value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} placeholder="e.g. 46000" />
              </div>
            </div>
          </div>

          {/* ── Products ── */}
          <div className={cardCls}>
            <h3 className="mb-4 flex items-center gap-2 text-[14px] font-bold text-neutral-900"><Package size={15} /> Products</h3>
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Search products to add…"
                value={prodQ}
                onChange={(e) => { setProdQ(e.target.value); searchProducts(e.target.value); }}
              />
              {prodSearching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-neutral-400" />}
              {prodResults.length > 0 && (
                <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
                  {prodResults.map((p) => (
                    <div key={p._id} className="flex items-center gap-3 px-3.5 py-2.5 transition hover:bg-neutral-50">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-neutral-900">{p.name}</p>
                        <p className="text-[12px] text-neutral-400">{pkr(p.price)} · {p.stock} in stock</p>
                        {(p.sizes?.length > 0 || p.colors?.length > 0) && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {p.sizes?.length > 0 && (
                              <select
                                className="rounded-lg border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] outline-none"
                                value={pickSize[p._id] || p.sizes[0] || ''}
                                onChange={(e) => setPickSize((s) => ({ ...s, [p._id]: e.target.value }))}
                              >
                                {p.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            )}
                            {p.colors?.length > 0 && (
                              <select
                                className="rounded-lg border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] outline-none"
                                value={pickColor[p._id] || p.colors[0]?.name || ''}
                                onChange={(e) => setPickColor((c) => ({ ...c, [p._id]: e.target.value }))}
                              >
                                {p.colors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                              </select>
                            )}
                            <input
                              type="number" min="1" max="10"
                              className="w-14 rounded-lg border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] outline-none"
                              defaultValue="1"
                              onChange={(e) => setPickQty((q) => ({ ...q, [p._id]: e.target.value }))}
                            />
                          </div>
                        )}
                      </div>
                      <button onClick={() => addLine(p)} className="rounded-full bg-neutral-900 p-2 text-white transition hover:bg-black" title="Add">
                        <Plus size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-neutral-400">No products yet — search and add the pieces this customer ordered.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {lines.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-neutral-900">{l.name}</p>
                      <p className="text-[12px] text-neutral-400">{l.size ? `Size ${l.size} · ` : ''}{l.color || ''} · {pkr(l.price)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => changeQty(i, l.quantity - 1)} className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:border-neutral-400" disabled={l.quantity <= 1}><Minus size={12} /></button>
                      <input type="number" min="1" max="10" className="w-12 rounded-lg border border-neutral-200 px-1 py-1 text-center text-[12px] outline-none" value={l.quantity} onChange={(e) => changeQty(i, e.target.value)} />
                      <button onClick={() => changeQty(i, l.quantity + 1)} className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:border-neutral-400"><Plus size={12} /></button>
                    </div>
                    <span className="w-20 text-right text-[13px] font-semibold text-neutral-900">{pkr(l.lineTotal)}</span>
                    <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-neutral-300 hover:bg-[#F5EDEB] hover:text-[#9A5548]"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="space-y-5">
          <div className={cardCls}>
            <h3 className="mb-3 text-[14px] font-bold text-neutral-900">Summary</h3>
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span className="font-medium text-neutral-900">{pkr(subtotal)}</span></div>
              {discountVal > 0 && <div className="flex justify-between text-[#3E5C4B]"><span>Discount</span><span>− {pkr(discountVal)}</span></div>}
              <div className="flex justify-between text-neutral-600"><span>Shipping</span><span className="font-medium text-neutral-900">{shippingCharge === 0 ? 'Free' : pkr(shippingCharge)}</span></div>
              {tax > 0 && <div className="flex justify-between text-neutral-600"><span>Tax ({taxPercent}%)</span><span className="font-medium text-neutral-900">{pkr(tax)}</span></div>}
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-[15px] font-bold text-neutral-900"><span>Total</span><span>{pkr(total)}</span></div>
            </div>

            <div className="mt-4">
              <label className={labelCls}>Courtesy discount (PKR)</label>
              <input type="number" min="0" className={inputCls} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
            </div>

            <div className="mt-4">
              <label className={labelCls}>Delivery method</label>
              <select className={inputCls} value={shipMethod} onChange={(e) => setShipMethod(e.target.value)}>
                {shipOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}{m.rate > 0 ? ` — ${pkr(m.rate)}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className={`${labelCls} flex items-center gap-1`}><CreditCard size={11} /> Payment method</label>
              <select className={inputCls} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {payOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="mt-4">
              <label className={labelCls}>Staff notes (internal)</label>
              <textarea className={`${inputCls} min-h-16 resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was agreed on the call…" />
            </div>
          </div>

          <button
            onClick={create}
            disabled={creating}
            className="w-full rounded-full bg-neutral-900 py-3 text-[14px] font-semibold text-white transition hover:bg-black disabled:opacity-60"
          >
            {creating ? <Loader2 size={16} className="mx-auto animate-spin" /> : `Create order · ${pkr(total)}`}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
