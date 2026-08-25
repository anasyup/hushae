import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, Loader2, Minus, Package, Plus, Search, ShoppingBag, Trash2, User, X,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import AdminLayout from '../AdminLayout';
import { pkr } from '../../lib/format';

/* ============================================================================
 * CREATE ORDER V3 — Phase 11 Video Pages Rebuild
 * Two-column composer: order composition (left) + sticky summary (right)
 * All business logic preserved from original DraftOrder.jsx
 * ========================================================================== */

export default function DraftOrder() {
  const { auth, toast, settings } = useApp();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  // Customer lookup
  const [customerResults, setCustomerResults] = useState([]);
  const [cusQ, setCusQ] = useState('');
  const [cusOpen, setCusOpen] = useState(false);
  const [picked, setPicked] = useState(null);

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '', province: '', postalCode: '' });
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);

  const [prodQ, setProdQ] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [prodSearching, setProdSearching] = useState(false);
  const [pickSize, setPickSize] = useState({});
  const [pickColor, setPickColor] = useState({});
  const [pickQty, setPickQty] = useState({});

  const [lines, setLines] = useState([]);
  const [shipMethod, setShipMethod] = useState('standard');
  const [payMethod, setPayMethod] = useState('COD');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const cusRef = useRef(null);

  /* ── Load locations + optional Customer 360 prefill ────────────────── */
  useEffect(() => {
    api('/locations').then((d) => setProvinces(d.provinces || [])).catch(() => {});
  }, []);

  const hydrateCustomer = async (customerId) => {
    if (!customerId) return;
    try {
      const d = await api(`/customers/${customerId}`, { token: auth?.token, noCache: true });
      const c = d.customer;
      const a = c.deliveryAddress || {};
      setPicked({ id: c.id, name: c.name, email: c.email, phone: c.phone, orders: c.metrics?.orders || 0 });
      setForm({
        name: c.name || '', phone: c.phone || '', email: c.email || '',
        address: a.address || '', city: a.city || '', province: a.province || '', postalCode: a.postalCode || '',
      });
      if (a.province) {
        const citiesData = await api(`/locations/${encodeURIComponent(a.province)}/cities`).catch(() => ({ cities: [] }));
        setCities(citiesData.cities || []);
      }
    } catch (err) { toast(err.message || 'Customer prefill failed'); }
  };

  useEffect(() => { hydrateCustomer(searchParams.get('customer')); }, [auth?.token, searchParams]); // eslint-disable-line

  useEffect(() => {
    const q = cusQ.trim();
    if (!q) { setCustomerResults([]); return undefined; }
    const timer = setTimeout(() => {
      api(`/customers/search?q=${encodeURIComponent(q)}&limit=8`, { token: auth?.token, noCache: true })
        .then((d) => setCustomerResults(d.customers || []))
        .catch(() => setCustomerResults([]));
    }, 220);
    return () => clearTimeout(timer);
  }, [cusQ, auth?.token]);

  const onProvince = async (p) => {
    setForm((f) => ({ ...f, province: p, city: '' }));
    setCities([]);
    if (!p) return;
    try { const d = await api(`/locations/${encodeURIComponent(p)}/cities`); setCities(d.cities || []); } catch { setCities([]); }
  };

  const pickCustomer = (c) => { setCusOpen(false); setCusQ(''); hydrateCustomer(c.id); };
  const clearCustomer = () => { setPicked(null); setForm({ name: '', phone: '', email: '', address: '', city: '', province: '', postalCode: '' }); };

  /* ── Product search ────────────────────────────────────────────────── */
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

  /* ── Totals (all business logic preserved) ─────────────────────────── */
  const shipOptions = useMemo(() => (settings?.checkout?.shippingMethods || []).filter((m) => m.enabled), [settings]);
  const payOptions = useMemo(() => {
    const list = settings?.checkout?.paymentList || [];
    return list.length
      ? list.filter((m) => m.enabled && !m.comingSoon).map((m) => m.id)
      : (settings?.paymentMethods ? ['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer'].filter((m) => settings.paymentMethods[{ COD: 'cod', JazzCash: 'jazzcash', EasyPaisa: 'easypaisa', 'Bank Transfer': 'bank' }[m]]) : ['COD']);
  }, [settings]);

  useEffect(() => { if (!shipOptions.length) return; if (!shipOptions.some((m) => m.id === shipMethod)) setShipMethod(shipOptions[0].id); }, [shipOptions]); // eslint-disable-line
  useEffect(() => { if (payOptions.length && !payOptions.includes(payMethod)) setPayMethod(payOptions[0]); }, [payOptions]); // eslint-disable-line

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
      toast('Fill the customer name, phone, address, city, province and postal code'); return;
    }
    if (lines.length === 0) { toast('Add at least one product'); return; }
    setCreating(true);
    try {
      const d = await api('/orders/manage', {
        method: 'POST', token: auth?.token,
        body: {
          customerInfo: { ...form, userId: picked?.id || null },
          items: lines.map((l) => ({ product: l.product, size: l.size, color: l.color, quantity: l.quantity })),
          paymentMethod: payMethod, shippingMethod: shipMethod, manualDiscount: discountVal, notes,
        },
      });
      toast(`Order ${d.order.orderNumber} created`);
      nav(`/admin/orders/${d.order._id}`);
    } catch (ex) { toast(ex.message || 'Could not create the order'); }
    finally { setCreating(false); }
  };

  const canCreate = form.name.trim() && form.phone.trim() && form.address.trim() && form.city.trim() && form.province.trim() && form.postalCode.trim() && lines.length > 0;

  return (
    <AdminLayout title="Create Order">
      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link><span>/</span>
            <Link to="/admin/orders">Orders</Link><span>/</span>
            <span>Create Order</span>
          </div>
          <h1 className="v3-h-page">Create Order</h1>
          <p className="v3-h-small mt-1">Build an order for a customer who ordered by phone or WhatsApp.</p>
        </div>
        <div className="v3-page-header-right">
          <Link to="/admin/orders" className="v3-btn v3-btn-secondary v3-btn-sm"><ArrowLeft size={12} /> Orders</Link>
        </div>
      </div>

      {/* ── TWO-COLUMN LAYOUT ────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

        {/* ══ LEFT: ORDER COMPOSITION ═══════════════════════════════════ */}
        <div className="space-y-6">

          {/* ── Customer Section ── */}
          <div className="v3-card">
            <div className="v3-card-header">
              <span className="v3-h-section flex items-center gap-2"><User size={15} /> Customer</span>
              {picked && (
                <button onClick={clearCustomer} className="v3-btn v3-btn-ghost v3-btn-sm"><X size={12} /> Change</button>
              )}
            </div>
            <div className="v3-card-body">
              {/* Customer search */}
              <div className="relative mb-4" ref={cusRef}>
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  className="v3-input" style={{ paddingLeft: 32 }}
                  placeholder="Search existing customer by name, phone or email…"
                  value={cusQ}
                  onChange={(e) => { setCusQ(e.target.value); setCusOpen(true); }}
                  onFocus={() => setCusOpen(true)}
                />
                {cusOpen && customerResults.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-20 mt-1 bg-white border border-[#E5E7EB] rounded-[5px] overflow-hidden" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    {customerResults.map((c) => (
                      <button key={c.id} onClick={() => pickCustomer(c)} className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-[#F5F6F8] transition-colors">
                        <div className="w-7 h-7 rounded-[4px] bg-[#F0F1F3] flex items-center justify-center text-[10px] font-bold text-[#6B7280] flex-shrink-0">
                          {(c.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-[#111] truncate">{c.name}</p>
                          <p className="text-[11px] text-[#9CA3AF]">{c.phone} · {c.email || '—'}</p>
                        </div>
                        {c.metrics?.orders > 0 && <span className="text-[10px] text-[#9CA3AF]">{c.metrics.orders} orders</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picked customer badge */}
              {picked && (
                <div className="mb-4 flex items-center gap-3 rounded-[5px] bg-[#F5F6F8] px-4 py-3">
                  <div className="w-8 h-8 rounded-[4px] bg-[#111] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                    {picked.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[#111]">{picked.name}</p>
                    <p className="text-[11px] text-[#6B7280]">{picked.phone} · {picked.email || '—'} · {picked.orders} orders</p>
                  </div>
                </div>
              )}

              {/* Customer form fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="v3-field">
                  <label className="v3-label">Name *</label>
                  <input className="v3-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Customer name" />
                </div>
                <div className="v3-field">
                  <label className="v3-label">Phone *</label>
                  <input className="v3-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="03XX XXXXXXX" />
                </div>
                <div className="v3-field sm:col-span-2">
                  <label className="v3-label">Email</label>
                  <input className="v3-input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="customer@email.com" />
                </div>
                <div className="v3-field sm:col-span-2">
                  <label className="v3-label">Address *</label>
                  <input className="v3-input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
                </div>
                <div className="v3-field">
                  <label className="v3-label">Province *</label>
                  <select className="v3-select w-full" value={form.province} onChange={(e) => onProvince(e.target.value)}>
                    <option value="">Select province</option>
                    {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="v3-field">
                  <label className="v3-label">City *</label>
                  <select className="v3-select w-full" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} disabled={!form.province}>
                    <option value="">Select city</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="v3-field">
                  <label className="v3-label">Postal Code *</label>
                  <input className="v3-input" value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} placeholder="e.g. 46000" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Products Section ── */}
          <div className="v3-card">
            <div className="v3-card-header">
              <span className="v3-h-section flex items-center gap-2"><Package size={15} /> Products</span>
              {lines.length > 0 && <span className="v3-status v3-status-active">{lines.length} item{lines.length > 1 ? 's' : ''}</span>}
            </div>
            <div className="v3-card-body">
              {/* Product search */}
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  className="v3-input" style={{ paddingLeft: 32 }}
                  placeholder="Search products to add…"
                  value={prodQ}
                  onChange={(e) => { setProdQ(e.target.value); searchProducts(e.target.value); }}
                />
                {prodSearching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#9CA3AF]" />}

                {prodResults.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-20 mt-1 bg-white border border-[#E5E7EB] rounded-[5px] overflow-hidden" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    {prodResults.map((p) => (
                      <div key={p._id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F6F8] transition-colors">
                        <div className="h-10 w-10 shrink-0 rounded-[3px] bg-[#F0F1F3] overflow-hidden border border-[#E5E7EB]">
                          {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-[#111]">{p.name}</p>
                          <p className="text-[11px] text-[#9CA3AF]">{pkr(p.price)} · {p.stock} in stock</p>
                          {(p.sizes?.length > 0 || p.colors?.length > 0) && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {p.sizes?.length > 0 && (
                                <select className="v3-select" style={{ height: 26, fontSize: 11, padding: '0 20px 0 6px' }}
                                  value={pickSize[p._id] || p.sizes[0] || ''}
                                  onChange={(e) => setPickSize((s) => ({ ...s, [p._id]: e.target.value }))}>
                                  {p.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              )}
                              {p.colors?.length > 0 && (
                                <select className="v3-select" style={{ height: 26, fontSize: 11, padding: '0 20px 0 6px' }}
                                  value={pickColor[p._id] || p.colors[0]?.name || ''}
                                  onChange={(e) => setPickColor((c) => ({ ...c, [p._id]: e.target.value }))}>
                                  {p.colors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                              )}
                              <input type="number" min="1" max="10" defaultValue="1"
                                className="v3-input" style={{ width: 56, height: 26, fontSize: 11, padding: '0 6px' }}
                                onChange={(e) => setPickQty((q) => ({ ...q, [p._id]: e.target.value }))} />
                            </div>
                          )}
                        </div>
                        <button onClick={() => addLine(p)} className="v3-btn v3-btn-primary v3-btn-sm" title="Add to order">
                          <Plus size={13} /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Line items */}
              {lines.length === 0 ? (
                <div className="v3-empty" style={{ padding: '32px 0' }}>
                  <Package size={20} className="v3-empty-icon" />
                  <p className="v3-empty-title">No products yet</p>
                  <p className="v3-empty-desc">Search and add the products this customer ordered.</p>
                </div>
              ) : (
                <div className="v3-table-wrap">
                  <table className="v3-table dense">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Options</th>
                        <th className="right">Qty</th>
                        <th className="right">Price</th>
                        <th className="right">Total</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={i}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-[3px] bg-[#F0F1F3] overflow-hidden border border-[#E5E7EB] flex-shrink-0">
                                {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : null}
                              </div>
                              <p className="text-[12px] font-medium text-[#111] truncate">{l.name}</p>
                            </div>
                          </td>
                          <td className="text-[11px] text-[#6B7280]">
                            {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => changeQty(i, l.quantity - 1)} disabled={l.quantity <= 1} className="w-6 h-6 rounded-[3px] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:border-[#111] hover:text-[#111] disabled:opacity-30"><Minus size={10} /></button>
                              <input type="number" min="1" max="10" className="v3-input text-center" style={{ width: 40, height: 26, fontSize: 11, padding: 0 }} value={l.quantity} onChange={(e) => changeQty(i, e.target.value)} />
                              <button onClick={() => changeQty(i, l.quantity + 1)} className="w-6 h-6 rounded-[3px] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:border-[#111] hover:text-[#111]"><Plus size={10} /></button>
                            </div>
                          </td>
                          <td className="right text-[12px] tabular text-[#6B7280]">{pkr(l.price)}</td>
                          <td className="right text-[12px] font-semibold tabular text-[#111]">{pkr(l.lineTotal)}</td>
                          <td>
                            <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Remove"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Notes (mobile only — desktop in sidebar) ── */}
          <div className="v3-card lg:hidden">
            <div className="v3-card-header"><span className="v3-h-section">Staff Notes</span></div>
            <div className="v3-card-body">
              <textarea className="v3-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was agreed on the call…" />
            </div>
          </div>
        </div>

        {/* ══ RIGHT: STICKY SUMMARY ═════════════════════════════════════ */}
        <div className="lg:sticky lg:top-16 lg:self-start space-y-4">

          {/* Order Summary */}
          <div className="v3-card">
            <div className="v3-card-header">
              <span className="v3-h-section">Order Summary</span>
            </div>
            <div className="v3-card-body space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6B7280]">Subtotal</span>
                <span className="font-medium text-[#111] tabular">{pkr(subtotal)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6B7280]">Discount</span>
                  <span className="font-medium text-[#111] tabular">− {pkr(discountVal)}</span>
                </div>
              )}
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6B7280]">Shipping</span>
                <span className="font-medium text-[#111] tabular">{shippingCharge === 0 ? 'Free' : pkr(shippingCharge)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6B7280]">Tax ({taxPercent}%)</span>
                  <span className="font-medium text-[#111] tabular">{pkr(tax)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#E5E7EB] pt-3 text-[15px]">
                <span className="font-bold text-[#111]">Total</span>
                <span className="font-bold text-[#111] tabular">{pkr(total)}</span>
              </div>
            </div>
          </div>

          {/* Discount */}
          <div className="v3-card">
            <div className="v3-card-body">
              <div className="v3-field">
                <label className="v3-label">Courtesy Discount (PKR)</label>
                <input type="number" min="0" className="v3-input" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
                {discountVal > 0 && <p className="v3-field-hint">Applied: − {pkr(discountVal)}</p>}
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="v3-card">
            <div className="v3-card-body">
              <div className="v3-field">
                <label className="v3-label">Delivery Method</label>
                <select className="v3-select w-full" value={shipMethod} onChange={(e) => setShipMethod(e.target.value)}>
                  {shipOptions.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}{m.rate > 0 ? ` — ${pkr(m.rate)}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="v3-card">
            <div className="v3-card-body">
              <div className="v3-field">
                <label className="v3-label flex items-center gap-1.5"><CreditCard size={11} /> Payment Method</label>
                <select className="v3-select w-full" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {payOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Notes (desktop) */}
          <div className="v3-card hidden lg:block">
            <div className="v3-card-body">
              <div className="v3-field">
                <label className="v3-label">Staff Notes (internal)</label>
                <textarea className="v3-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was agreed on the call…" />
              </div>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={create}
            disabled={creating || !canCreate}
            className="w-full v3-btn v3-btn-primary v3-btn-lg"
          >
            {creating ? <Loader2 size={15} className="animate-spin" /> : <ShoppingBag size={15} />}
            {creating ? 'Creating…' : `Create Order · ${pkr(total)}`}
          </button>

          {!canCreate && lines.length === 0 && (
            <p className="text-[11px] text-[#9CA3AF] text-center">Add products and fill customer details to create.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
