import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Copy, FilePlus2, MessageCircle, Minus, PackageCheck, Pencil,
  Plus, Receipt, Search, Trash2, User as UserIcon, Wallet, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PaginationBar from './PaginationBar';
import './products-atelier.css';

/* ===========================================================================
 * DRAFT ORDERS — ATELIER family. Shopify-style draft orders, better:
 * saved staff orders (phone/WhatsApp sales) that convert into real orders
 * through the exact same server-side pricing + stock pipeline.
 *
 * No fazool functions: list + search + paginate, create/edit, delete,
 * one-click convert. That's the whole job, done well.
 * ========================================================================== */

const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'];
const PAYMENTS = ['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer', 'Visa'];

const blankDraft = () => ({
  customerInfo: { name: '', phone: '', email: '', address: '', city: '', province: 'Punjab', postalCode: '' },
  items: [], notes: '', manualDiscount: 0, discountType: 'amount',
  shippingMode: 'store', customShipping: 0, taxExempt: false,
  tags: [], linkedCustomerId: null, paymentMethod: 'COD',
});

function ageLabel(iso) {
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600000));
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ${h % 24}h ago`;
}

export default function DraftOrders() {
  const { auth, toast } = useApp();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [editing, setEditing] = useState(null); // null | {} new | draft doc
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setErr('');
    const sp = new URLSearchParams({ page: String(page), per: String(per) });
    if (dq) sp.set('q', dq);
    api(`/orders/manage/drafts?${sp}`, { token: auth.token })
      .then((d) => { setList(d.drafts || []); setTotal(d.total || 0); setStats(d.stats || null); })
      .catch(() => { setList([]); setErr('Something prevented the drafts from loading.'); });
  };
  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { setPage(1); }, [per]);
  useEffect(() => { load(); }, [page, per, dq]); // eslint-disable-line

  const remove = async (d) => {
    if (!window.confirm(`Delete draft for ${d.customerInfo?.name || 'customer'}? This cannot be undone.`)) return;
    setBusyId(d._id);
    try { await api(`/orders/manage/drafts/${d._id}`, { method: 'DELETE', token: auth.token }); toast('Draft deleted'); load(); }
    catch (e) { toast(e.message || 'Delete failed'); }
    setBusyId(null);
  };

  const duplicate = (d) => {
    const copy = { ...blankDraft(), ...d, customerInfo: { ...d.customerInfo }, items: (d.items || []).map((it) => ({ ...it })) };
    delete copy._id; delete copy.createdAt; delete copy.updatedAt; delete copy.__v;
    setEditing(copy);
  };

  const waShare = (d) => {
    const digits = String(d.customerInfo?.phone || '').replace(/\D/g, '');
    if (!digits) { toast('Customer phone chahiye WhatsApp ke liye'); return; }
    const intl = digits.startsWith('92') ? digits : digits.startsWith('0') ? `92${digits.slice(1)}` : `92${digits}`;
    const lines = (d.items || []).map((it) => `• ${it.name} x${it.quantity} — ${pkr((it.price || 0) * (it.quantity || 1))}`);
    const text = `HUSHAE — order summary for ${d.customerInfo?.name || 'you'}:\n${lines.join('\n')}\nEstimated total: ${pkr(d.estimatedTotal || 0)}\nReply YES to confirm.`;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const convert = async (d) => {
    setBusyId(d._id);
    try {
      const r = await api(`/orders/manage/drafts/${d._id}/convert`, { method: 'POST', token: auth.token, body: {} });
      toast(r.message || 'Draft converted to order');
      load();
    } catch (e) { toast(e.message || 'Could not convert the draft'); }
    setBusyId(null);
  };

  const pageCount = Math.max(1, Math.ceil(total / per));

  return (
    <AdminLayout title="Draft orders">
      <div className="pa-outer">
        <div className="pa-wrap">

          <div className="pa-head">
            <div>
              <h1>Draft orders</h1>
              <p>Phone aur WhatsApp sales — save now, convert to a real order when the customer confirms.</p>
            </div>
            <div className="pa-head-actions">
              <button type="button" onClick={() => setEditing(blankDraft())} className="pa-btn-black">
                <FilePlus2 size={12} strokeWidth={2.4} /> Create draft order
              </button>
            </div>
          </div>

          {/* ── Stats ──────────────────────────────────────────────── */}
          <div className="pa-stats pa-stats-3">
            <div className="pa-stat active">
              <p className="pa-stat-label">Open drafts</p>
              <p className="pa-stat-val">{list === null ? '—' : total.toLocaleString()}</p>
              <span className="pa-stat-note pa-note-blue">Awaiting confirmation</span>
            </div>
            <div className="pa-stat">
              <p className="pa-stat-label">Value on hold</p>
              <p className="pa-stat-val" style={{ fontSize: 22 }}>{stats ? pkr(stats.value || 0) : '—'}</p>
              <span className="pa-stat-note pa-note-green">Estimated</span>
            </div>
            <div className="pa-stat">
              <p className="pa-stat-label">Oldest draft</p>
              <p className="pa-stat-val" style={{ fontSize: 22 }}>{stats?.oldest ? ageLabel(stats.oldest) : '—'}</p>
              <span className={`pa-stat-note ${stats?.oldest ? 'pa-note-yellow' : 'pa-note-gray'}`}>{stats?.oldest ? 'Follow up' : 'All clear'}</span>
            </div>
          </div>

          {/* ── Search ─────────────────────────────────────────────── */}
          <div className="pa-card pa-toolbar">
            <div className="pa-search">
              <Search size={13} strokeWidth={2} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drafts by customer name or phone…" aria-label="Search drafts" />
            </div>
            {q && <button type="button" onClick={() => setQ('')} className="pa-btn-sm" style={{ marginLeft: 'auto' }}>Clear</button>}
          </div>

          {/* ── States ─────────────────────────────────────────────── */}
          {err && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><AlertTriangle size={18} strokeWidth={1.8} /></div>
              <h3>Unable to load drafts</h3>
              <p>{err}</p>
              <button type="button" onClick={load} className="pa-btn-black">Try again</button>
            </div>
          )}

          {list === null && !err && (
            <div className="pa-card pa-skeleton">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="pa-sk-row" style={{ height: 56 }} />)}</div>
          )}

          {!err && list !== null && list.length === 0 && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><Receipt size={18} strokeWidth={1.8} /></div>
              <h3>{dq ? 'No drafts match' : 'No draft orders yet'}</h3>
              <p>{dq ? 'Try a different name or number.' : 'Customer ne phone pe order dia? Draft banayein, confirm hone par ek click me real order me badlein.'}</p>
              {!dq && (
                <button type="button" onClick={() => setEditing(blankDraft())} className="pa-btn-black">
                  <FilePlus2 size={12} strokeWidth={2.4} /> Create draft order
                </button>
              )}
            </div>
          )}

          {/* ── Table ─────────────────────────────────────────────── */}
          {!err && list !== null && list.length > 0 && (
            <div className="pa-card pa-tbl-card">
              <div className="pa-tbl-scroll">
                <table className="pa-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: '26%' }}>Customer</th>
                      <th style={{ width: '26%' }}>Items</th>
                      <th style={{ width: '12%' }}>Estimated</th>
                      <th style={{ width: '10%' }}>Payment</th>
                      <th className="pa-hide-xl" style={{ width: '10%' }}>Updated</th>
                      <th className="pa-th-act" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((d, i) => (
                      <tr key={d._id} style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}>
                        <td style={{ minWidth: 0 }}>
                          <span className="pa-name" style={{ cursor: 'default' }}>{d.customerInfo?.name}</span>
                          <span className="pa-sub">{d.customerInfo?.phone} · {d.customerInfo?.city || '—'}</span>
                        </td>
                        <td style={{ minWidth: 0 }}>
                          <span className="pa-cell-muted">
                            {(d.items || []).reduce((n, it) => n + (it.quantity || 1), 0)} pcs · {(d.items || [])[0]?.name || '—'}{(d.items || []).length > 1 ? ` +${(d.items || []).length - 1} more` : ''}
                          </span>
                        </td>
                        <td><span className="pa-price">{pkr(d.estimatedTotal || 0)}</span></td>
                        <td><span className="pa-badge pa-b-gray"><span className="pa-dot" aria-hidden />{d.paymentMethod || 'COD'}</span></td>
                        <td className="pa-hide-xl"><span className="pa-cell-muted">{d.updatedAt ? ageLabel(d.updatedAt) : '—'}</span></td>
                        <td>
                          <div className="pa-row-actions">
                            <button type="button" className="pa-action-btn" onClick={() => waShare(d)} aria-label="Share on WhatsApp" title="WhatsApp summary bhejein">
                              <MessageCircle size={12} strokeWidth={2} />
                            </button>
                            <button type="button" className="pa-action-btn" onClick={() => duplicate(d)} aria-label="Duplicate draft" title="Duplicate">
                              <Copy size={12} strokeWidth={2} />
                            </button>
                            <button type="button" className="pa-action-btn" onClick={() => setEditing(d)} aria-label="Edit draft" title="Edit">
                              <Pencil size={12} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              className="pa-btn-black"
                              style={{ height: 26, fontSize: 10, padding: '0 10px' }}
                              disabled={busyId === d._id}
                              onClick={() => convert(d)}
                              title="Convert to a real order"
                            >
                              <PackageCheck size={11} strokeWidth={2.2} /> {busyId === d._id ? '…' : 'Create order'}
                            </button>
                            <button type="button" className="pa-action-btn danger" disabled={busyId === d._id} onClick={() => remove(d)} aria-label="Delete draft" title="Delete">
                              <Trash2 size={12} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Pagination ────────────────────────────────────────── */}
          {list !== null && total > 0 && (
            <PaginationBar page={page} pages={pageCount} total={total} per={per} onPage={setPage} onPer={(v) => setPer(v)} />
          )}

        </div>
      </div>

      {editing && (
        <DraftEditor
          draft={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </AdminLayout>
  );
}

/* ==========================================================================
 * DraftEditor — ATELIER modal. Server prices everything on convert; the
 * editor shows honest estimates from the picked products.
 * ======================================================================== */
function DraftEditor({ draft, onClose, onSaved }) {
  const { auth, toast, settings } = useApp();
  const isNew = !draft._id;
  const [c, setC] = useState(() => ({
    ...blankDraft(),
    ...draft,
    customerInfo: { ...blankDraft().customerInfo, ...(draft.customerInfo || {}) },
    items: (draft.items || []).map((it) => ({ ...it })),
  }));
  const [busy, setBusy] = useState(false);
  const [pq, setPq] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const productsRef = useRef(new Map()); // id → full product (for sizes)

  /* Link an existing customer account (prefill + attach on convert). */
  const [allCustomers, setAllCustomers] = useState(null);
  const [cq, setCq] = useState('');
  useEffect(() => {
    api('/admin/customers', { token: auth.token }).then((d) => setAllCustomers(d.customers || [])).catch(() => setAllCustomers([]));
  }, [auth.token]);
  const custResults = useMemo(() => {
    const term = cq.trim().toLowerCase();
    if (!term || !allCustomers) return [];
    return allCustomers.filter((cu) =>
      cu.name?.toLowerCase().includes(term) || cu.phone?.includes(term) || cu.email?.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [cq, allCustomers]);
  const attachCustomer = (cu) => {
    setC((x) => ({
      ...x,
      linkedCustomerId: cu.id,
      customerInfo: { ...x.customerInfo, name: cu.name || x.customerInfo.name, phone: cu.phone || x.customerInfo.phone, email: cu.email || x.customerInfo.email },
    }));
    setCq('');
  };

  /* product search */
  useEffect(() => {
    const term = pq.trim();
    if (term.length < 2) { setResults([]); return undefined; }
    setSearching(true);
    const t = setTimeout(() => {
      api(`/products/admin/list?page=1&per=8&q=${encodeURIComponent(term)}`, { token: auth.token })
        .then((d) => {
          (d.products || []).forEach((p) => productsRef.current.set(String(p._id), p));
          setResults(d.products || []);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [pq, auth.token]);

  const addItem = (p) => {
    setC((x) => ({
      ...x,
      items: [...x.items, { product: p._id, name: p.name, size: p.sizes?.[0] || '', quantity: 1, price: p.price }],
    }));
    setPq(''); setResults([]);
  };
  const setItem = (i, patch) => setC((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const dropItem = (i) => setC((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }));

  const subtotal = (c.items || []).reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0);
  const discVal = Math.max(0, Number(c.manualDiscount) || 0);
  const discount = c.discountType === 'percent'
    ? Math.round((subtotal * Math.min(100, discVal)) / 100)
    : Math.min(discVal, subtotal);
  const shipFree = subtotal >= (settings?.freeShippingThreshold || Infinity);
  const taxPct = c.taxExempt ? 0 : (Number(settings?.cart?.taxPercent) || 0);
  const tax = taxPct > 0 ? Math.round(((subtotal - discount) * taxPct) / 100) : 0;
  const shipping = !c.items.length ? 0
    : c.shippingMode === 'none' ? 0
    : c.shippingMode === 'custom' ? Math.max(0, Number(c.customShipping) || 0)
    : (shipFree ? 0 : (settings?.shippingFlatRate || 350));
  const total = Math.max(0, subtotal - discount + shipping + tax);

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        customerInfo: c.customerInfo, items: c.items, notes: c.notes,
        manualDiscount: discVal, discountType: c.discountType,
        shippingMode: c.shippingMode, customShipping: c.customShipping,
        taxExempt: c.taxExempt, tags: c.tags, linkedCustomerId: c.linkedCustomerId,
        paymentMethod: c.paymentMethod,
      };
      if (isNew) await api('/orders/manage/drafts', { method: 'POST', token: auth.token, body });
      else await api(`/orders/manage/drafts/${draft._id}`, { method: 'PUT', token: auth.token, body });
      toast(isNew ? 'Draft saved' : 'Draft updated');
      onSaved();
    } catch (e) { toast(e.message || 'Could not save the draft'); }
    setBusy(false);
  };

  const ci = c.customerInfo;
  const setCi = (k, v) => setC((x) => ({ ...x, customerInfo: { ...x.customerInfo, [k]: v } }));

  return (
    <div className="pa-modal-overlay" onClick={() => !busy && onClose()}>
      <div className="pa-modal wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={isNew ? 'New draft order' : 'Edit draft order'}>

        <div className="pa-modal-head">
          <div>
            <h3>{isNew ? 'New draft order' : 'Edit draft order'}</h3>
            <p>Save now — pricing, tax aur shipping server compute karta hai jab order banta hai.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="pa-action-btn" aria-label="Close"><X size={13} strokeWidth={2.2} /></button>
        </div>

        <div className="pa-modal-body">

          {/* ── customer ── */}
          <p className="pa-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <UserIcon size={12} strokeWidth={2} /> Customer
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="pa-field">
            <div>
              <label className="pa-field-label">Name *</label>
              <input className="pa-modal-input" value={ci.name} onChange={(e) => setCi('name', e.target.value)} placeholder="e.g. Mahnoor Baig" />
            </div>
            <div>
              <label className="pa-field-label">Phone *</label>
              <input className="pa-modal-input" value={ci.phone} onChange={(e) => setCi('phone', e.target.value)} placeholder="03XX-XXXXXXX" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="pa-field">
            <div>
              <label className="pa-field-label">City *</label>
              <input className="pa-modal-input" value={ci.city} onChange={(e) => setCi('city', e.target.value)} placeholder="Lahore" />
            </div>
            <div>
              <label className="pa-field-label">Province *</label>
              <select className="pa-select" style={{ width: '100%', maxWidth: 'none', height: 38 }} value={ci.province} onChange={(e) => setCi('province', e.target.value)}>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="pa-field">
            <label className="pa-field-label">Address *</label>
            <input className="pa-modal-input" value={ci.address} onChange={(e) => setCi('address', e.target.value)} placeholder="House, street, area" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }} className="pa-field">
            <div>
              <label className="pa-field-label">Postal code *</label>
              <input className="pa-modal-input" value={ci.postalCode} onChange={(e) => setCi('postalCode', e.target.value)} placeholder="54000" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="pa-field-label">Email (optional — confirmation email)</label>
              <input className="pa-modal-input" value={ci.email} onChange={(e) => setCi('email', e.target.value)} placeholder="customer@email.com" />
            </div>
          </div>

          {/* ── link existing customer ── */}
          <div className="pa-field">
            <label className="pa-field-label">Link existing customer (optional)</label>
            {c.linkedCustomerId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pa-badge pa-b-green"><span className="pa-dot" aria-hidden />Account linked</span>
                <button type="button" className="pa-text-link" onClick={() => setC((x) => ({ ...x, linkedCustomerId: null }))}>Unlink</button>
              </div>
            ) : (
              <>
                <div className="pa-search" style={{ maxWidth: 'none', position: 'relative' }}>
                  <Search size={13} strokeWidth={2} />
                  <input value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Search customers by name / phone / email…" aria-label="Search customers" />
                </div>
                {cq.trim() && (
                  <div className="pa-picker" style={{ maxHeight: 150, marginTop: 6 }}>
                    {custResults.map((cu) => (
                      <button type="button" key={cu.id} className="pa-picker-row" onClick={() => attachCustomer(cu)}>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span className="pa-picker-name">{cu.name}</span>
                          <span className="pa-picker-sub">{cu.phone} · {cu.orders} order{cu.orders === 1 ? '' : 's'}</span>
                        </span>
                      </button>
                    ))}
                    {custResults.length === 0 && <p className="pa-picker-empty">No customers match.</p>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── items ── */}
          <p className="pa-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 10px' }}>
            <Wallet size={12} strokeWidth={2} /> Products
          </p>
          <div className="pa-search" style={{ maxWidth: 'none', marginBottom: 8, position: 'relative' }}>
            <Search size={13} strokeWidth={2} />
            <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Search product to add…" aria-label="Search products" />
          </div>
          {(searching || results.length > 0) && (
            <div className="pa-picker" style={{ maxHeight: 180, marginBottom: 8 }}>
              {results.map((p) => (
                <button type="button" key={p._id} className="pa-picker-row" onClick={() => addItem(p)}>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="pa-picker-name">{p.name}</span>
                    <span className="pa-picker-sub">{p.sku || p.categorySlug}</span>
                  </span>
                  <span className="pa-picker-price">{pkr(p.price)}</span>
                </button>
              ))}
              {!searching && results.length === 0 && <p className="pa-picker-empty">No products match.</p>}
            </div>
          )}

          {c.items.length === 0 && <p className="pa-field-hint">Kam az kam ek product add karein.</p>}
          {c.items.map((it, i) => {
            const prod = productsRef.current.get(String(it.product));
            const sizes = prod?.sizes || [];
            return (
              <div key={`${it.product}-${i}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) 84px 92px 92px 84px 26px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span className="pa-picker-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                <select className="pa-select" style={{ height: 30, maxWidth: 'none' }} value={it.size} onChange={(e) => setItem(i, { size: e.target.value })} aria-label="Size" disabled={!sizes.length}>
                  {(sizes.length ? sizes : [it.size || '—']).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  className="pa-modal-input"
                  style={{ height: 30, fontSize: 11.5 }}
                  type="number"
                  min="0"
                  value={it.price ?? ''}
                  onChange={(e) => setItem(i, { price: Math.max(0, Number(e.target.value) || 0) })}
                  aria-label="Unit price (custom override)"
                  title="Custom unit price — catalog price se alag rate yahan likhein"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button type="button" className="pa-action-btn" style={{ width: 22, height: 22 }} onClick={() => setItem(i, { quantity: Math.max(1, it.quantity - 1) })} aria-label="Less"><Minus size={10} /></button>
                  <span className="pa-stock-num">{it.quantity}</span>
                  <button type="button" className="pa-action-btn" style={{ width: 22, height: 22 }} onClick={() => setItem(i, { quantity: Math.min(10, it.quantity + 1) })} aria-label="More"><Plus size={10} /></button>
                </div>
                <span className="pa-picker-price">{pkr((it.price || 0) * (it.quantity || 1))}</span>
                <button type="button" className="pa-action-btn danger" style={{ width: 22, height: 22 }} onClick={() => dropItem(i)} aria-label="Remove"><X size={10} /></button>
              </div>
            );
          })}

          {/* ── pricing + options (Shopify parity) ── */}
          <div className="pa-rules-box" style={{ marginTop: 12, marginBottom: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="pa-field-label">Payment method</label>
                <select className="pa-select" style={{ width: '100%', maxWidth: 'none', height: 34 }} value={c.paymentMethod} onChange={(e) => setC((x) => ({ ...x, paymentMethod: e.target.value }))}>
                  {PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="pa-field-label">Discount</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select className="pa-select" style={{ height: 34, maxWidth: 84 }} value={c.discountType} onChange={(e) => setC((x) => ({ ...x, discountType: e.target.value }))} aria-label="Discount type">
                    <option value="amount">PKR</option>
                    <option value="percent">%</option>
                  </select>
                  <input className="pa-modal-input" type="number" min="0" value={c.manualDiscount || ''} onChange={(e) => setC((x) => ({ ...x, manualDiscount: Number(e.target.value) || 0 }))} placeholder="0" />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label className="pa-field-label">Shipping</label>
                <select className="pa-select" style={{ width: '100%', maxWidth: 'none', height: 34 }} value={c.shippingMode} onChange={(e) => setC((x) => ({ ...x, shippingMode: e.target.value }))}>
                  <option value="store">Store rates (free over threshold)</option>
                  <option value="custom">Custom rate</option>
                  <option value="none">No shipping / pickup</option>
                </select>
              </div>
              {c.shippingMode === 'custom' ? (
                <div>
                  <label className="pa-field-label">Custom shipping (PKR)</label>
                  <input className="pa-modal-input" type="number" min="0" value={c.customShipping || ''} onChange={(e) => setC((x) => ({ ...x, customShipping: Number(e.target.value) || 0 }))} placeholder="0" />
                </div>
              ) : (
                <div className="pa-switch-row">
                  <div>
                    <p className="pa-switch-label" style={{ margin: 0 }}>Tax exempt</p>
                    <p className="pa-switch-desc" style={{ margin: 0 }}>Is order pe tax nahi lagega</p>
                  </div>
                  <button type="button" role="switch" aria-checked={!!c.taxExempt} aria-label="Tax exempt" className={`pa-switch ${c.taxExempt ? 'on' : ''}`} onClick={() => setC((x) => ({ ...x, taxExempt: !x.taxExempt }))} />
                </div>
              )}
            </div>
            {c.shippingMode === 'custom' && (
              <div className="pa-switch-row" style={{ marginTop: 6 }}>
                <div>
                  <p className="pa-switch-label" style={{ margin: 0 }}>Tax exempt</p>
                  <p className="pa-switch-desc" style={{ margin: 0 }}>Is order pe tax nahi lagega</p>
                </div>
                <button type="button" role="switch" aria-checked={!!c.taxExempt} aria-label="Tax exempt" className={`pa-switch ${c.taxExempt ? 'on' : ''}`} onClick={() => setC((x) => ({ ...x, taxExempt: !x.taxExempt }))} />
              </div>
            )}
            <div className="pa-field" style={{ marginTop: 12, marginBottom: 0 }}>
              <label className="pa-field-label">Tags (comma separated)</label>
              <input className="pa-modal-input" value={(c.tags || []).join(', ')} onChange={(e) => setC((x) => ({ ...x, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))} placeholder="wholesale, repeat-caller…" />
            </div>
            <div className="pa-field" style={{ marginTop: 12, marginBottom: 0 }}>
              <label className="pa-field-label">Notes</label>
              <textarea className="pa-textarea" rows={2} value={c.notes} onChange={(e) => setC((x) => ({ ...x, notes: e.target.value }))} placeholder="Call pe kia baat hui, delivery instructions…" />
            </div>
            <div style={{ marginTop: 12, borderTop: '1px solid var(--pa-border-light)', paddingTop: 10, fontSize: 11.5, color: 'var(--pa-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><b style={{ color: 'var(--pa-text)' }}>{pkr(subtotal)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}><span>Discount{c.discountType === 'percent' ? ` (${Math.min(100, discVal)}%)` : ''}</span><b style={{ color: 'var(--pa-text)' }}>− {pkr(discount)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}><span>Shipping {c.shippingMode === 'store' && shipFree && subtotal > 0 ? '(free over threshold)' : ''}</span><b style={{ color: 'var(--pa-text)' }}>{pkr(shipping)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}><span>Tax{c.taxExempt ? ' (exempt)' : taxPct ? ` (${taxPct}%)` : ''}</span><b style={{ color: 'var(--pa-text)' }}>{pkr(tax)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 13 }}>
                <b style={{ color: 'var(--pa-text)' }}>Estimated total</b>
                <b style={{ color: 'var(--pa-text)', fontVariantNumeric: 'tabular-nums' }}>{pkr(total)}</b>
              </div>
              <p className="pa-field-hint" style={{ marginTop: 6 }}>Custom prices aur overrides order bante waqt server-side apply hote hain — final total wahin se aata hai.</p>
            </div>
          </div>
        </div>

        <div className="pa-modal-foot">
          <p className="pa-modal-note">{c.items.reduce((n, it) => n + (it.quantity || 1), 0)} pcs · {ci.name || 'no customer yet'}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} disabled={busy} className="pa-btn-sm">Cancel</button>
            <button
              type="button"
              onClick={save}
              disabled={busy || !ci.name.trim() || !ci.phone.trim() || !c.items.length}
              className="pa-btn-black"
            >
              <FilePlus2 size={12} strokeWidth={2.2} /> {busy ? 'Saving…' : isNew ? 'Save draft' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
