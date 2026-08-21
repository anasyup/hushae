import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';

const TABS = [
  ['overview', 'Overview'],
  ['stock', 'Inventory'],
  ['po', 'Purchasing'],
  ['returns', 'Returns'],
  ['comms', 'WhatsApp / SMS'],
  ['risk', 'Risk'],
  ['ship', 'Shipping'],
  ['tax', 'Tax'],
  ['launch', 'Launchpad'],
];

export default function CommerceOps({ start = 'overview' }) {
  const { auth, toast } = useApp();
  const token = auth?.token;
  const [tab, setTab] = useState(start);
  const [ov, setOv] = useState(null);

  const loadOv = () => api('/ops/overview', { token }).then(setOv).catch(() => setOv({ counts: {} }));
  useEffect(() => { loadOv(); }, [token]); // eslint-disable-line

  return (
    <AdminLayout title="Commerce OS">
      <p className="mb-4 max-w-3xl text-[13px] leading-relaxed text-neutral-500">
        Working operations layer: stock movements, purchase orders, RMA + refund ledger, comms consent, risk holds, shipping profiles and tax zones. Not decorative.
      </p>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-2 text-[12px] font-semibold ${tab === k ? 'bg-neutral-900 text-white' : 'border border-neutral-200 bg-white text-neutral-600'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview ov={ov} />}
      {tab === 'stock' && <Stock token={token} toast={toast} />}
      {tab === 'po' && <Purchasing token={token} toast={toast} />}
      {tab === 'returns' && <Returns token={token} toast={toast} />}
      {tab === 'comms' && <Comms token={token} toast={toast} />}
      {tab === 'risk' && <Risk token={token} toast={toast} />}
      {tab === 'ship' && <Shipping token={token} toast={toast} />}
      {tab === 'tax' && <Tax token={token} toast={toast} />}
      {tab === 'launch' && <Launchpad token={token} toast={toast} />}
    </AdminLayout>
  );
}

function Overview({ ov }) {
  const c = ov?.counts || {};
  const tiles = [
    ['Warehouses', c.warehouses ?? '—'],
    ['Low stock', c.lowStock ?? '—'],
    ['Open POs', c.openPurchaseOrders ?? '—'],
    ['Open RMAs', c.openReturns ?? '—'],
    ['Risk hold', c.riskHold ?? '—'],
  ];
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map(([l, v]) => (
          <div key={l} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{l}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-[12px] font-semibold text-neutral-800">Recent stock movements</p>
        <ul className="mt-3 space-y-2 text-[13px]">
          {(ov?.recentMoves || []).length === 0 && <li className="text-neutral-400">No movements yet — receive a PO or post an adjustment.</li>}
          {(ov?.recentMoves || []).map((m) => (
            <li key={m._id} className="flex justify-between gap-3 border-b border-neutral-50 pb-2">
              <span>{m.product?.name || 'Product'} · {m.type} · {m.qty}</span>
              <span className="text-neutral-400">{new Date(m.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stock({ token, toast }) {
  const [warehouses, setWh] = useState([]);
  const [products, setProducts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ productId: '', warehouseId: '', qty: '', note: '' });
  const [xfer, setXfer] = useState({ productId: '', fromWarehouseId: '', toWarehouseId: '', qty: '' });
  const [whName, setWhName] = useState({ code: '', name: '', city: 'Lahore' });

  const load = () => {
    api('/ops/warehouses', { token }).then((d) => setWh(d.warehouses || [])).catch(() => {});
    api('/products/admin/list', { token }).then((d) => setProducts((d.products || []).slice(0, 200))).catch(() => {});
    api('/ops/stock/insights', { token }).then(setInsights).catch(() => {});
    api('/ops/stock/history', { token }).then((d) => setHistory(d.movements || [])).catch(() => {});
  };
  useEffect(load, [token]);

  const adjust = async (e) => {
    e.preventDefault();
    try {
      await api('/ops/stock/adjust', { method: 'POST', token, body: { ...form, qty: Number(form.qty) } });
      toast('Stock adjusted'); load();
    } catch (ex) { toast(ex.message); }
  };
  const transfer = async (e) => {
    e.preventDefault();
    try {
      await api('/ops/stock/transfer', { method: 'POST', token, body: { ...xfer, qty: Number(xfer.qty) } });
      toast('Transferred'); load();
    } catch (ex) { toast(ex.message); }
  };
  const addWh = async (e) => {
    e.preventDefault();
    try {
      await api('/ops/warehouses', { method: 'POST', token, body: whName });
      toast('Warehouse added'); load();
    } catch (ex) { toast(ex.message); }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Inventory value" value={insights ? pkr(insights.valuation || 0) : '—'} />
        <Stat label="Dead stock SKUs" value={insights?.dead ?? '—'} />
        <Stat label="Stockout &lt; 7 days" value={insights?.stockoutSoon ?? '—'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Adjust stock">
          <form onSubmit={adjust} className="space-y-2">
            <Select value={form.productId} onChange={(v) => setForm({ ...form, productId: v })} options={products.map((p) => ({ v: p._id, l: `${p.name} (${p.stock})` }))} placeholder="Product" />
            <Select value={form.warehouseId} onChange={(v) => setForm({ ...form, warehouseId: v })} options={warehouses.map((w) => ({ v: w._id, l: `${w.code} · ${w.name}` }))} placeholder="Warehouse" />
            <input className="input" type="number" placeholder="Qty (+ receive / − reduce)" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            <input className="input" placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button className="btn-primary w-full" type="submit">Post adjustment</button>
          </form>
        </Card>
        <Card title="Transfer between locations">
          <form onSubmit={transfer} className="space-y-2">
            <Select value={xfer.productId} onChange={(v) => setXfer({ ...xfer, productId: v })} options={products.map((p) => ({ v: p._id, l: p.name }))} placeholder="Product" />
            <Select value={xfer.fromWarehouseId} onChange={(v) => setXfer({ ...xfer, fromWarehouseId: v })} options={warehouses.map((w) => ({ v: w._id, l: w.code }))} placeholder="From" />
            <Select value={xfer.toWarehouseId} onChange={(v) => setXfer({ ...xfer, toWarehouseId: v })} options={warehouses.map((w) => ({ v: w._id, l: w.code }))} placeholder="To" />
            <input className="input" type="number" min="1" placeholder="Qty" value={xfer.qty} onChange={(e) => setXfer({ ...xfer, qty: e.target.value })} />
            <button className="btn-primary w-full" type="submit">Transfer</button>
          </form>
        </Card>
      </div>

      <Card title="Add warehouse / location">
        <form onSubmit={addWh} className="flex flex-wrap gap-2">
          <input className="input max-w-[8rem]" placeholder="Code" value={whName.code} onChange={(e) => setWhName({ ...whName, code: e.target.value })} />
          <input className="input max-w-xs" placeholder="Name" value={whName.name} onChange={(e) => setWhName({ ...whName, name: e.target.value })} />
          <input className="input max-w-[8rem]" placeholder="City" value={whName.city} onChange={(e) => setWhName({ ...whName, city: e.target.value })} />
          <button className="btn-outline" type="submit">Add location</button>
        </form>
        <ul className="mt-3 flex flex-wrap gap-2 text-[12px]">{warehouses.map((w) => <li key={w._id} className="rounded-full bg-neutral-100 px-2 py-1">{w.code} · {w.name}</li>)}</ul>
      </Card>

      <Card title="Forecast / dead stock (14-day velocity)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead><tr className="text-[11px] uppercase tracking-wider text-neutral-400">
              <th className="py-2">Product</th><th>Stock</th><th>Sold 14d</th><th>Cover</th><th>Value</th><th>Flag</th>
            </tr></thead>
            <tbody>
              {(insights?.rows || []).map((r) => (
                <tr key={r.productId} className="border-t border-neutral-100">
                  <td className="py-2">{r.name}<div className="text-[11px] text-neutral-400">{r.sku}</div></td>
                  <td>{r.stock}</td><td>{r.sold14}</td>
                  <td>{r.coverDays === 999 ? '—' : `${r.coverDays}d`}</td>
                  <td>{pkr(r.value)}</td>
                  <td>{r.stockoutSoon ? 'Stockout soon' : r.dead ? 'Dead' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Audit trail">
        <ul className="space-y-1 text-[13px] max-h-64 overflow-auto">
          {history.slice(0, 40).map((h) => (
            <li key={h._id}>{h.type} · {h.qty} · {h.product?.name} · {h.warehouse?.code} · {h.note}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Purchasing({ token, toast }) {
  const [suppliers, setS] = useState([]);
  const [pos, setPo] = useState([]);
  const [wh, setWh] = useState([]);
  const [products, setP] = useState([]);
  const [sup, setSup] = useState({ name: '', phone: '', city: '' });
  const [draft, setDraft] = useState({ supplier: '', warehouse: '', product: '', qty: 10, cost: 0 });

  const load = () => {
    api('/ops/suppliers', { token }).then((d) => setS(d.suppliers || [])).catch(() => {});
    api('/ops/purchase-orders', { token }).then((d) => setPo(d.purchaseOrders || [])).catch(() => {});
    api('/ops/warehouses', { token }).then((d) => setWh(d.warehouses || [])).catch(() => {});
    api('/products/admin/list', { token }).then((d) => setP((d.products || []).slice(0, 200))).catch(() => {});
  };
  useEffect(load, [token]);

  const addSup = async (e) => {
    e.preventDefault();
    try { await api('/ops/suppliers', { method: 'POST', token, body: sup }); toast('Supplier saved'); load(); }
    catch (ex) { toast(ex.message); }
  };
  const createPo = async (e) => {
    e.preventDefault();
    const prod = products.find((x) => x._id === draft.product);
    try {
      await api('/ops/purchase-orders', {
        method: 'POST', token,
        body: {
          supplier: draft.supplier, warehouse: draft.warehouse,
          lines: [{ product: draft.product, name: prod?.name, sku: prod?.sku, qtyOrdered: Number(draft.qty), unitCost: Number(draft.cost) }],
        },
      });
      toast('PO created'); load();
    } catch (ex) { toast(ex.message); }
  };
  const receive = async (id) => {
    try { await api(`/ops/purchase-orders/${id}/receive`, { method: 'POST', token, body: {} }); toast('Received into stock'); load(); }
    catch (ex) { toast(ex.message); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Suppliers">
        <form onSubmit={addSup} className="mb-3 flex flex-wrap gap-2">
          <input className="input" placeholder="Name" value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} required />
          <input className="input" placeholder="Phone" value={sup.phone} onChange={(e) => setSup({ ...sup, phone: e.target.value })} />
          <button className="btn-outline" type="submit">Add</button>
        </form>
        <ul className="text-[13px] space-y-1">{suppliers.map((s) => <li key={s._id}>{s.name} · {s.city || '—'} · {s.phone || '—'}</li>)}</ul>
      </Card>
      <Card title="New purchase order">
        <form onSubmit={createPo} className="space-y-2">
          <Select value={draft.supplier} onChange={(v) => setDraft({ ...draft, supplier: v })} options={suppliers.map((s) => ({ v: s._id, l: s.name }))} placeholder="Supplier" />
          <Select value={draft.warehouse} onChange={(v) => setDraft({ ...draft, warehouse: v })} options={wh.map((w) => ({ v: w._id, l: w.name }))} placeholder="Receive into" />
          <Select value={draft.product} onChange={(v) => setDraft({ ...draft, product: v })} options={products.map((p) => ({ v: p._id, l: p.name }))} placeholder="Product" />
          <input className="input" type="number" min="1" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} />
          <input className="input" type="number" min="0" placeholder="Unit cost" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} />
          <button className="btn-primary w-full" type="submit">Create PO</button>
        </form>
      </Card>
      <div className="lg:col-span-2">
        <Card title="Open / recent POs">
          <ul className="space-y-2 text-[13px]">
            {pos.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-50 pb-2">
                <span>{p.number} · {p.supplier?.name} · {p.status} · {p.lines?.length} lines</span>
                {p.status !== 'received' && p.status !== 'cancelled' && (
                  <button type="button" className="btn-outline" onClick={() => receive(p._id)}>Receive all</button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Returns({ token, toast }) {
  const [list, setList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ orderId: '', reason: 'Does not fit', notes: '' });
  const [refund, setRefund] = useState({ orderId: '', amount: '', method: 'manual' });

  const load = () => {
    api('/ops/returns', { token }).then((d) => setList(d.returns || [])).catch(() => {});
    api('/orders/admin?limit=40', { token }).then((d) => setOrders((d.orders || []).slice(0, 40))).catch(() => {});
  };
  useEffect(load, [token]);

  const open = async (e) => {
    e.preventDefault();
    try { await api('/ops/returns', { method: 'POST', token, body: form }); toast('RMA opened'); load(); }
    catch (ex) { toast(ex.message); }
  };
  const stage = async (id, next) => {
    try { await api(`/ops/returns/${id}/stage`, { method: 'PATCH', token, body: { stage: next } }); load(); }
    catch (ex) { toast(ex.message); }
  };
  const pay = async (e) => {
    e.preventDefault();
    try {
      await api('/ops/refunds', { method: 'POST', token, body: { ...refund, amount: Number(refund.amount) } });
      toast('Refund recorded on ledger'); load();
    } catch (ex) { toast(ex.message); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Open RMA">
        <form onSubmit={open} className="space-y-2">
          <Select value={form.orderId} onChange={(v) => setForm({ ...form, orderId: v })} options={orders.map((o) => ({ v: o._id, l: `${o.orderNumber} · ${o.customerInfo?.name}` }))} placeholder="Order" />
          <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <textarea className="input" rows={2} placeholder="Notes / inspection" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="btn-primary w-full" type="submit">Create RMA</button>
        </form>
      </Card>
      <Card title="Record money movement">
        <form onSubmit={pay} className="space-y-2">
          <Select value={refund.orderId} onChange={(v) => setRefund({ ...refund, orderId: v })} options={orders.map((o) => ({ v: o._id, l: o.orderNumber }))} placeholder="Order" />
          <input className="input" type="number" min="1" placeholder="Amount PKR" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
          <select className="input" value={refund.method} onChange={(e) => setRefund({ ...refund, method: e.target.value })}>
            <option value="manual">Manual</option>
            <option value="store_credit">Store credit</option>
            <option value="gateway">Payment gateway</option>
            <option value="cod_adjust">COD adjust</option>
          </select>
          <button className="btn-primary w-full" type="submit">Post refund</button>
        </form>
      </Card>
      <div className="lg:col-span-2">
        <Card title="Return lifecycle">
          <ul className="space-y-3">
            {list.map((r) => (
              <li key={r._id} className="rounded-lg border border-neutral-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold">{r.rma} · {r.orderNumber} · {r.stage}</p>
                  <div className="flex flex-wrap gap-1">
                    {['approved', 'in_transit', 'received', 'inspected', 'refund', 'completed', 'rejected'].map((s) => (
                      <button key={s} type="button" className="rounded border border-neutral-200 px-2 py-1 text-[11px]" onClick={() => stage(r._id, s)}>{s}</button>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-[12px] text-neutral-500">{r.reason} — {r.notes}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Comms({ token, toast }) {
  const [templates, setT] = useState([]);
  const [consent, setC] = useState([]);
  const [log, setL] = useState([]);
  const [send, setSend] = useState({ channel: 'whatsapp', to: '', body: '', templateKey: '' });
  const [opt, setOpt] = useState({ phone: '', channel: 'whatsapp', status: 'opt_in' });

  const load = () => {
    api('/ops/comms/templates', { token }).then((d) => setT(d.templates || [])).catch(() => {});
    api('/ops/comms/consent', { token }).then((d) => setC(d.consent || [])).catch(() => {});
    api('/ops/comms/log', { token }).then((d) => setL(d.log || [])).catch(() => {});
  };
  useEffect(load, [token]);

  const applyTpl = (t) => setSend({ ...send, channel: t.channel, body: t.body, templateKey: t.key });
  const doSend = async (e) => {
    e.preventDefault();
    try {
      const r = await api('/ops/comms/send', { method: 'POST', token, body: send });
      toast('Logged');
      if (r.openUrl) window.open(r.openUrl, '_blank');
      load();
    } catch (ex) { toast(ex.message); }
  };
  const saveOpt = async (e) => {
    e.preventDefault();
    try { await api('/ops/comms/consent', { method: 'POST', token, body: opt }); toast('Consent saved'); load(); }
    catch (ex) { toast(ex.message); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Templates">
        <ul className="space-y-2 text-[13px]">
          {templates.map((t) => (
            <li key={t._id} className="flex justify-between gap-2">
              <span>{t.channel} / {t.key}</span>
              <button type="button" className="text-[12px] font-semibold underline" onClick={() => applyTpl(t)}>Use</button>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Send (logged + opt-out enforced)">
        <form onSubmit={doSend} className="space-y-2">
          <input className="input" placeholder="Phone 03XX…" value={send.to} onChange={(e) => setSend({ ...send, to: e.target.value })} />
          <textarea className="input" rows={3} value={send.body} onChange={(e) => setSend({ ...send, body: e.target.value })} />
          <button className="btn-primary w-full" type="submit">Send / open WhatsApp</button>
        </form>
      </Card>
      <Card title="Consent">
        <form onSubmit={saveOpt} className="mb-3 flex flex-wrap gap-2">
          <input className="input" placeholder="Phone" value={opt.phone} onChange={(e) => setOpt({ ...opt, phone: e.target.value })} />
          <select className="input max-w-[8rem]" value={opt.status} onChange={(e) => setOpt({ ...opt, status: e.target.value })}>
            <option value="opt_in">Opt in</option>
            <option value="opt_out">Opt out</option>
          </select>
          <button className="btn-outline" type="submit">Save</button>
        </form>
        <ul className="max-h-40 overflow-auto text-[12px]">{consent.slice(0, 20).map((c) => <li key={c._id}>{c.phone} · {c.channel} · {c.status}</li>)}</ul>
      </Card>
      <Card title="Delivery log">
        <ul className="max-h-48 overflow-auto text-[12px] space-y-1">
          {log.map((l) => <li key={l._id}>{l.channel} → {l.to} · {l.status} · {l.templateKey}</li>)}
        </ul>
      </Card>
    </div>
  );
}

function Risk({ token, toast }) {
  const [orders, setOrders] = useState([]);
  const load = () => api('/ops/risk', { token }).then((d) => setOrders(d.orders || [])).catch(() => {});
  useEffect(load, [token]);
  const review = async (id, status) => {
    try { await api(`/ops/risk/${id}/review`, { method: 'POST', token, body: { status } }); toast(status); load(); }
    catch (ex) { toast(ex.message); }
  };
  return (
    <Card title="Flagged / hold queue">
      {orders.length === 0 && <p className="text-[13px] text-neutral-500">No flagged orders.</p>}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o._id} className="rounded-lg border border-neutral-100 p-3">
            <p className="text-[13px] font-semibold">{o.orderNumber} · {pkr(o.total)} · {o.paymentMethod} · score {o.fraudFilter?.score ?? '—'}</p>
            <p className="text-[12px] text-neutral-500">{(o.fraudFilter?.reasons || []).join(' · ')}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn-outline" onClick={() => review(o._id, 'approved')}>Approve</button>
              <button type="button" className="rounded-lg bg-red-600 px-3 py-2 text-[12px] font-semibold text-white" onClick={() => review(o._id, 'rejected')}>Reject / cancel</button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Shipping({ token, toast }) {
  const [list, setList] = useState([]);
  const [f, setF] = useState({ name: 'Pakistan standard', countries: 'PK', courier: 'TCS', rate: 250, type: 'flat' });
  const load = () => api('/ops/shipping', { token }).then((d) => setList(d.profiles || [])).catch(() => {});
  useEffect(load, [token]);
  const save = async (e) => {
    e.preventDefault();
    try {
      await api('/ops/shipping', {
        method: 'POST', token,
        body: {
          name: f.name, courier: f.courier, countries: f.countries.split(',').map((s) => s.trim()),
          methods: [{ id: 'std', name: f.name, type: f.type, rate: Number(f.rate), enabled: true, etaDaysMin: 2, etaDaysMax: 5 }],
        },
      });
      toast('Shipping profile saved'); load();
    } catch (ex) { toast(ex.message); }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="New zone / method">
        <form onSubmit={save} className="space-y-2">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="input" placeholder="Countries ISO (PK,AE)" value={f.countries} onChange={(e) => setF({ ...f, countries: e.target.value })} />
          <input className="input" placeholder="Courier" value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })} />
          <input className="input" type="number" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
          <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="flat">Flat</option><option value="free">Free</option>
            <option value="pickup">Pickup</option><option value="local">Local delivery</option>
            <option value="weight">Weight</option>
          </select>
          <button className="btn-primary w-full" type="submit">Save profile</button>
        </form>
      </Card>
      <Card title="Profiles">
        <ul className="text-[13px] space-y-2">
          {list.map((p) => <li key={p._id}>{p.name} · {p.courier} · {(p.countries || []).join(', ')} · {p.methods?.length} methods</li>)}
        </ul>
      </Card>
    </div>
  );
}

function Tax({ token, toast }) {
  const [zones, setZ] = useState([]);
  const [f, setF] = useState({ name: 'Pakistan GST', country: 'PK', rate: 18, inclusive: false, appliesToShipping: false });
  const load = () => api('/ops/tax', { token }).then((d) => setZ(d.zones || [])).catch(() => {});
  useEffect(load, [token]);
  const save = async (e) => {
    e.preventDefault();
    try { await api('/ops/tax', { method: 'POST', token, body: { ...f, rate: Number(f.rate) } }); toast('Tax zone saved'); load(); }
    catch (ex) { toast(ex.message); }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Tax zone">
        <form onSubmit={save} className="space-y-2">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="input" placeholder="Country ISO" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} />
          <input className="input" type="number" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.inclusive} onChange={(e) => setF({ ...f, inclusive: e.target.checked })} /> Inclusive</label>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.appliesToShipping} onChange={(e) => setF({ ...f, appliesToShipping: e.target.checked })} /> Tax shipping</label>
          <button className="btn-primary w-full" type="submit">Save zone</button>
        </form>
      </Card>
      <Card title="Zones">
        <ul className="text-[13px] space-y-2">{zones.map((z) => <li key={z._id}>{z.name} · {z.country} · {z.rate}% {z.inclusive ? 'incl' : 'excl'}</li>)}</ul>
      </Card>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}
function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
function Launchpad({ token, toast }) {
  const [list, setList] = useState([]);
  const [products, setP] = useState([]);
  const [f, setF] = useState({ name: '', startsAt: '', endsAt: '', discountCode: '', bannerNote: '', productIds: [] });
  const load = () => {
    api('/ops/launches', { token }).then((d) => setList(d.launches || [])).catch(() => {});
    api('/products/admin/list', { token }).then((d) => setP((d.products || []).slice(0, 80))).catch(() => {});
  };
  useEffect(load, [token]);
  const save = async (e) => {
    e.preventDefault();
    try {
      await api('/ops/launches', {
        method: 'POST', token,
        body: {
          ...f,
          startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null,
          endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
        },
      });
      toast('Launch saved as draft'); load();
    } catch (ex) { toast(ex.message); }
  };
  const go = async (id, path) => {
    try { await api(`/ops/launches/${id}/${path}`, { method: 'POST', token, body: {} }); load(); }
    catch (ex) { toast(ex.message); }
  };
  const toggleP = (id) => setF((x) => ({
    ...x,
    productIds: x.productIds.includes(id) ? x.productIds.filter((i) => i !== id) : [...x.productIds, id],
  }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="New campaign (draft → live → end)">
        <form onSubmit={save} className="space-y-2">
          <input className="input" placeholder="BLACK FRIDAY" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <input className="input" type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} />
          <input className="input" type="datetime-local" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} />
          <input className="input" placeholder="Coupon code (optional)" value={f.discountCode} onChange={(e) => setF({ ...f, discountCode: e.target.value })} />
          <input className="input" placeholder="Banner note" value={f.bannerNote} onChange={(e) => setF({ ...f, bannerNote: e.target.value })} />
          <div className="max-h-40 overflow-auto rounded-lg border border-neutral-200 p-2 text-[12px]">
            {products.map((p) => (
              <label key={p._id} className="flex items-center gap-2 py-0.5">
                <input type="checkbox" checked={f.productIds.includes(p._id)} onChange={() => toggleP(p._id)} />
                {p.name}
              </label>
            ))}
          </div>
          <button className="btn-primary w-full" type="submit">Save draft</button>
        </form>
      </Card>
      <Card title="Launches">
        <ul className="space-y-3 text-[13px]">
          {list.map((l) => (
            <li key={l._id} className="rounded-lg border border-neutral-100 p-3">
              <p className="font-semibold">{l.name} · {l.status}</p>
              <p className="text-[12px] text-neutral-500">{l.productIds?.length || 0} products · {l.discountCode || 'no coupon'}</p>
              <div className="mt-2 flex gap-2">
                {l.status !== 'live' && l.status !== 'ended' && <button type="button" className="btn-outline" onClick={() => go(l._id, 'go-live')}>Go live (sale on)</button>}
                {l.status === 'live' && <button type="button" className="btn-outline" onClick={() => go(l._id, 'end')}>End (sale off)</button>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}
