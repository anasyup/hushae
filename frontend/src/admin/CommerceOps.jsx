import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { btnGhost, btnSolid, ctl, EditorialEmpty, MonoStatus, TableSkeleton } from './orders/orderUi';

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
      <PageHeader
        title="Operations"
        description="Commerce operations and fulfillment."
      />
      <div className="mb-8 flex flex-wrap gap-1.5">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={tab === k ? btnSolid : btnGhost}>
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
  if (!ov) return <TableSkeleton rows={6} />;
  return (
    <div>
      <section className="mb-10">
        <p className="adm-index">01 — Operational overview</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map(([l, v]) => (
            <div key={l} className="px-5 py-6">
              <p className="adm-label">{l}</p>
              <p className="adm-metric mt-3 text-[26px] text-black">{v}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <p className="adm-index">02 — Recent stock movements</p>
        {(ov?.recentMoves || []).length === 0 ? (
          <EditorialEmpty title="No movements yet" description="Receive a PO or post an adjustment." />
        ) : (
          <>
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[minmax(0,1.4fr)_0.6fr_0.4fr_0.8fr] md:gap-3">
              {['Product', 'Type', 'Qty', 'When'].map((h) => <p key={h} className="adm-label">{h}</p>)}
            </div>
            {(ov.recentMoves || []).map((m) => (
              <div key={m._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[minmax(0,1.4fr)_0.6fr_0.4fr_0.8fr] md:items-center md:gap-3">
                <span className="truncate text-[13px] text-black">{m.product?.name || 'Product'}</span>
                <span className="text-[11px] uppercase tracking-[0.12em] text-[#999999]">{m.type}</span>
                <span className="text-[13px] tabular-nums text-[#333333]">{m.qty}</span>
                <span className="text-[12px] text-[#AAAAAA]">{new Date(m.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </>
        )}
      </section>
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

  const flagOf = (r) => {
    if (r.stockoutSoon) return { label: 'LOW', dim: false };
    if (r.dead) return { label: 'DEAD', dim: true };
    if (!r.stock) return { label: 'OUT OF STOCK', dim: true };
    return { label: 'IN STOCK', dim: false };
  };

  return (
    <div>
      <section className="mb-10">
        <p className="adm-index">01 — Inventory overview</p>
        <div className="adm-divide-x grid grid-cols-1 border-y border-[#EAEAEA] sm:grid-cols-3">
          {[
            ['Inventory value', insights ? pkr(insights.valuation || 0) : '—'],
            ['Dead stock SKUs', insights?.dead ?? '—'],
            ['Stockout < 7 days', insights?.stockoutSoon ?? '—'],
          ].map(([l, v]) => (
            <div key={l} className="px-5 py-6">
              <p className="adm-label">{l}</p>
              <p className="adm-metric mt-3 text-[24px] text-black">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Warehouses</p>
        {warehouses.length === 0 ? (
          <p className="mb-4 text-[12px] text-[#AAAAAA]">No locations yet.</p>
        ) : (
          <div className="mb-6">
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[0.5fr_minmax(0,1.2fr)_0.8fr] md:gap-3">
              {['Code', 'Warehouse', 'City'].map((h) => <p key={h} className="adm-label">{h}</p>)}
            </div>
            {warehouses.map((w) => (
              <div key={w._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[0.5fr_minmax(0,1.2fr)_0.8fr] md:gap-3">
                <span className="text-[12px] uppercase tracking-[0.12em] text-[#777777]">{w.code}</span>
                <span className="text-[13px] text-black">{w.name}</span>
                <span className="text-[12px] text-[#999999]">{w.city || '—'}</span>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={addWh} className="flex flex-wrap items-end gap-2 border-t border-[#EAEAEA] pt-4">
          <div><label className="adm-label mb-1.5 block">Code</label><input className={`${ctl} w-28`} placeholder="LHE" value={whName.code} onChange={(e) => setWhName({ ...whName, code: e.target.value })} /></div>
          <div className="min-w-[10rem] flex-1"><label className="adm-label mb-1.5 block">Name</label><input className={ctl} placeholder="Name" value={whName.name} onChange={(e) => setWhName({ ...whName, name: e.target.value })} /></div>
          <div><label className="adm-label mb-1.5 block">City</label><input className={`${ctl} w-32`} placeholder="City" value={whName.city} onChange={(e) => setWhName({ ...whName, city: e.target.value })} /></div>
          <button className={btnGhost} type="submit">Add location</button>
        </form>
      </section>

      <div className="mb-10 grid gap-10 lg:grid-cols-2">
        <section>
          <p className="adm-index">03 — Stock adjustment</p>
          <form onSubmit={adjust} className="space-y-3 border-y border-[#EAEAEA] py-6">
            <Select value={form.productId} onChange={(v) => setForm({ ...form, productId: v })} options={products.map((p) => ({ v: p._id, l: `${p.name} (${p.stock})` }))} placeholder="Product" />
            <Select value={form.warehouseId} onChange={(v) => setForm({ ...form, warehouseId: v })} options={warehouses.map((w) => ({ v: w._id, l: `${w.code} · ${w.name}` }))} placeholder="Warehouse" />
            <div><label className="adm-label mb-1.5 block">Qty (+ receive / − reduce)</label><input className={ctl} type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></div>
            <div><label className="adm-label mb-1.5 block">Reason</label><input className={ctl} placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <button className={btnSolid} type="submit">Save adjustment</button>
          </form>
        </section>
        <section>
          <p className="adm-index">03 — Transfer</p>
          <form onSubmit={transfer} className="space-y-3 border-y border-[#EAEAEA] py-6">
            <Select value={xfer.productId} onChange={(v) => setXfer({ ...xfer, productId: v })} options={products.map((p) => ({ v: p._id, l: p.name }))} placeholder="Product" />
            <Select value={xfer.fromWarehouseId} onChange={(v) => setXfer({ ...xfer, fromWarehouseId: v })} options={warehouses.map((w) => ({ v: w._id, l: w.code }))} placeholder="From" />
            <Select value={xfer.toWarehouseId} onChange={(v) => setXfer({ ...xfer, toWarehouseId: v })} options={warehouses.map((w) => ({ v: w._id, l: w.code }))} placeholder="To" />
            <div><label className="adm-label mb-1.5 block">Quantity</label><input className={ctl} type="number" min="1" value={xfer.qty} onChange={(e) => setXfer({ ...xfer, qty: e.target.value })} /></div>
            <button className={btnSolid} type="submit">Transfer</button>
          </form>
        </section>
      </div>

      <section className="mb-10">
        <p className="adm-index">04 — Inventory</p>
        {!(insights?.rows || []).length ? (
          <EditorialEmpty title="No inventory insights" description="Stock velocity appears after orders land." />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[minmax(0,1.4fr)_0.5fr_0.5fr_0.5fr_0.7fr_0.8fr] gap-3 border-b border-[#EAEAEA] py-2">
                {['Product', 'Stock', 'Sold 14d', 'Cover', 'Value', 'Status'].map((h) => <p key={h} className="adm-label">{h}</p>)}
              </div>
              {(insights.rows || []).map((r) => {
                const f = flagOf(r);
                return (
                  <div key={r.productId} className="grid grid-cols-[minmax(0,1.4fr)_0.5fr_0.5fr_0.5fr_0.7fr_0.8fr] items-center gap-3 border-b border-[#F0F0F0] py-3 adm-row-hover">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-black">{r.name}</p>
                      <p className="text-[11px] text-[#AAAAAA]">{r.sku}</p>
                    </div>
                    <span className="text-[13px] tabular-nums text-[#333333]">{r.stock}</span>
                    <span className="text-[13px] tabular-nums text-[#777777]">{r.sold14}</span>
                    <span className="text-[12px] tabular-nums text-[#999999]">{r.coverDays === 999 ? '—' : `${r.coverDays}d`}</span>
                    <span className="text-[13px] tabular-nums text-black">{pkr(r.value)}</span>
                    <MonoStatus label={f.label} dim={f.dim} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section>
        <p className="adm-index">05 — Movement history</p>
        {history.length === 0 ? (
          <EditorialEmpty title="No movements" description="Adjustments and transfers appear here." />
        ) : (
          <>
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[0.6fr_minmax(0,1.2fr)_0.5fr_0.4fr_minmax(0,1fr)] md:gap-3">
              {['Type', 'Product', 'Warehouse', 'Qty', 'Reference'].map((h) => <p key={h} className="adm-label">{h}</p>)}
            </div>
            {history.slice(0, 40).map((h) => (
              <div key={h._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[0.6fr_minmax(0,1.2fr)_0.5fr_0.4fr_minmax(0,1fr)] md:items-center md:gap-3">
                <span className="text-[11px] uppercase tracking-[0.12em] text-[#999999]">{h.type}</span>
                <span className="truncate text-[13px] text-black">{h.product?.name || '—'}</span>
                <span className="text-[12px] text-[#999999]">{h.warehouse?.code || '—'}</span>
                <span className="text-[13px] tabular-nums text-[#333333]">{h.qty}</span>
                <span className="truncate text-[12px] text-[#AAAAAA]">{h.note || '—'}</span>
              </div>
            ))}
          </>
        )}
      </section>
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
    <div>
      <section className="mb-10">
        <p className="adm-index">01 — Purchasing overview</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] sm:grid-cols-3">
          {[
            ['Suppliers', suppliers.length],
            ['Purchase orders', pos.length],
            ['Open', pos.filter((p) => p.status !== 'received' && p.status !== 'cancelled').length],
          ].map(([l, v]) => (
            <div key={l} className="px-5 py-6">
              <p className="adm-label">{l}</p>
              <p className="adm-metric mt-3 text-[26px] text-black">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Purchase orders</p>
        <form onSubmit={createPo} className="mb-6 grid gap-3 border-y border-[#EAEAEA] py-6 md:grid-cols-2">
          <Select value={draft.supplier} onChange={(v) => setDraft({ ...draft, supplier: v })} options={suppliers.map((s) => ({ v: s._id, l: s.name }))} placeholder="Supplier" />
          <Select value={draft.warehouse} onChange={(v) => setDraft({ ...draft, warehouse: v })} options={wh.map((w) => ({ v: w._id, l: w.name }))} placeholder="Receive into" />
          <Select value={draft.product} onChange={(v) => setDraft({ ...draft, product: v })} options={products.map((p) => ({ v: p._id, l: p.name }))} placeholder="Product" />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="adm-label mb-1.5 block">Qty</label><input className={ctl} type="number" min="1" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} /></div>
            <div><label className="adm-label mb-1.5 block">Unit cost</label><input className={ctl} type="number" min="0" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} /></div>
          </div>
          <div className="md:col-span-2"><button className={btnSolid} type="submit">Create PO</button></div>
        </form>
        {pos.length === 0 ? (
          <EditorialEmpty title="No purchase orders" description="Create a PO above to receive stock." />
        ) : (
          <>
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[0.8fr_minmax(0,1fr)_0.4fr_0.6fr_auto] md:gap-3">
              {['PO', 'Supplier', 'Items', 'Status', ''].map((h) => <p key={h || 'a'} className="adm-label">{h}</p>)}
            </div>
            {pos.map((p) => (
              <div key={p._id} className="grid grid-cols-1 items-center gap-2 border-b border-[#F0F0F0] py-3 md:grid-cols-[0.8fr_minmax(0,1fr)_0.4fr_0.6fr_auto] md:gap-3">
                <span className="text-[13px] text-black">{p.number}</span>
                <span className="text-[12px] text-[#555555]">{p.supplier?.name || '—'}</span>
                <span className="text-[12px] tabular-nums text-[#777777]">{p.lines?.length || 0}</span>
                <MonoStatus label={String(p.status || '—').replace(/_/g, ' ')} dim={p.status === 'cancelled' || p.status === 'received'} />
                {p.status !== 'received' && p.status !== 'cancelled' ? (
                  <button type="button" className={btnGhost} onClick={() => receive(p._id)}>Receive all</button>
                ) : <span />}
              </div>
            ))}
          </>
        )}
      </section>

      <section>
        <p className="adm-index">03 — Suppliers</p>
        <form onSubmit={addSup} className="mb-6 flex flex-wrap items-end gap-2 border-y border-[#EAEAEA] py-6">
          <div className="min-w-[10rem] flex-1"><label className="adm-label mb-1.5 block">Name</label><input className={ctl} placeholder="Name" value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} required /></div>
          <div><label className="adm-label mb-1.5 block">Phone</label><input className={`${ctl} w-40`} placeholder="Phone" value={sup.phone} onChange={(e) => setSup({ ...sup, phone: e.target.value })} /></div>
          <button className={btnGhost} type="submit">Add</button>
        </form>
        {suppliers.length === 0 ? (
          <EditorialEmpty title="No suppliers" description="Add a supplier to raise purchase orders." />
        ) : (
          <>
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[minmax(0,1.2fr)_0.8fr_0.8fr] md:gap-3">
              {['Supplier', 'City', 'Contact'].map((h) => <p key={h} className="adm-label">{h}</p>)}
            </div>
            {suppliers.map((s) => (
              <div key={s._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[minmax(0,1.2fr)_0.8fr_0.8fr] md:gap-3">
                <span className="text-[13px] text-black">{s.name}</span>
                <span className="text-[12px] text-[#999999]">{s.city || '—'}</span>
                <span className="text-[12px] text-[#777777]">{s.phone || '—'}</span>
              </div>
            ))}
          </>
        )}
      </section>
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

  const STAGES = ['approved', 'in_transit', 'received', 'inspected', 'refund', 'completed', 'rejected'];

  return (
    <div>
      <section className="mb-10">
        <p className="adm-index">01 — Return overview</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA]">
          <div className="px-5 py-6">
            <p className="adm-label">Open RMAs</p>
            <p className="adm-metric mt-3 text-[26px] text-black">{list.filter((r) => r.stage !== 'completed' && r.stage !== 'rejected').length}</p>
          </div>
          <div className="px-5 py-6">
            <p className="adm-label">Total returns</p>
            <p className="adm-metric mt-3 text-[26px] text-black">{list.length}</p>
          </div>
        </div>
      </section>

      <div className="mb-10 grid gap-10 lg:grid-cols-2">
        <section>
          <p className="adm-index">02 — Open RMA</p>
          <form onSubmit={open} className="space-y-3 border-y border-[#EAEAEA] py-6">
            <Select value={form.orderId} onChange={(v) => setForm({ ...form, orderId: v })} options={orders.map((o) => ({ v: o._id, l: `${o.orderNumber} · ${o.customerInfo?.name}` }))} placeholder="Order" />
            <div><label className="adm-label mb-1.5 block">Reason</label><input className={ctl} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            <div><label className="adm-label mb-1.5 block">Notes</label><textarea className={`${ctl} min-h-16 py-2`} rows={2} placeholder="Notes / inspection" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <button className={btnSolid} type="submit">Create RMA</button>
          </form>
        </section>
        <section>
          <p className="adm-index">02 — Refund ledger</p>
          <form onSubmit={pay} className="space-y-3 border-y border-[#EAEAEA] py-6">
            <Select value={refund.orderId} onChange={(v) => setRefund({ ...refund, orderId: v })} options={orders.map((o) => ({ v: o._id, l: o.orderNumber }))} placeholder="Order" />
            <div><label className="adm-label mb-1.5 block">Amount PKR</label><input className={ctl} type="number" min="1" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} /></div>
            <div>
              <label className="adm-label mb-1.5 block">Method</label>
              <select className={ctl} value={refund.method} onChange={(e) => setRefund({ ...refund, method: e.target.value })}>
                <option value="manual">Manual</option>
                <option value="store_credit">Store credit</option>
                <option value="gateway">Payment gateway</option>
                <option value="cod_adjust">COD adjust</option>
              </select>
            </div>
            <button className={btnSolid} type="submit">Post refund</button>
          </form>
        </section>
      </div>

      <section>
        <p className="adm-index">03 — Returns</p>
        {list.length === 0 ? (
          <EditorialEmpty title="No returns" description="Open an RMA from an order above." />
        ) : (
          list.map((r) => (
            <div key={r._id} className="border-b border-[#EAEAEA] py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] text-black">{r.rma} · {r.orderNumber}</p>
                  <p className="mt-1 text-[12px] text-[#AAAAAA]">{r.reason}{r.notes ? ` — ${r.notes}` : ''}</p>
                </div>
                <MonoStatus label={String(r.stage || '').replace(/_/g, ' ')} dim={r.stage === 'completed' || r.stage === 'rejected'} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STAGES.map((s) => (
                  <button key={s} type="button" className={r.stage === s ? btnSolid : btnGhost} onClick={() => stage(r._id, s)}>
                    {s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
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
    <div>
      <section className="mb-10">
        <p className="adm-index">01 — Templates</p>
        {templates.length === 0 ? (
          <EditorialEmpty title="No templates" description="Templates appear here when they exist." />
        ) : (
          templates.map((t) => (
            <div key={t._id} className="flex items-center justify-between gap-3 border-b border-[#F0F0F0] py-3">
              <span className="text-[13px] text-black">{t.channel} / {t.key}</span>
              <button type="button" className={btnGhost} onClick={() => applyTpl(t)}>Use</button>
            </div>
          ))
        )}
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Send</p>
        <form onSubmit={doSend} className="space-y-3 border-y border-[#EAEAEA] py-6">
          <div><label className="adm-label mb-1.5 block">Phone</label><input className={ctl} placeholder="03XX…" value={send.to} onChange={(e) => setSend({ ...send, to: e.target.value })} /></div>
          <div><label className="adm-label mb-1.5 block">Message</label><textarea className={`${ctl} min-h-20 py-2`} rows={3} value={send.body} onChange={(e) => setSend({ ...send, body: e.target.value })} /></div>
          <button className={btnSolid} type="submit">Send / open WhatsApp</button>
        </form>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <p className="adm-index">03 — Consent</p>
          <form onSubmit={saveOpt} className="mb-4 flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1"><label className="adm-label mb-1.5 block">Phone</label><input className={ctl} value={opt.phone} onChange={(e) => setOpt({ ...opt, phone: e.target.value })} /></div>
            <div>
              <label className="adm-label mb-1.5 block">Status</label>
              <select className={ctl} value={opt.status} onChange={(e) => setOpt({ ...opt, status: e.target.value })}>
                <option value="opt_in">Opt in</option>
                <option value="opt_out">Opt out</option>
              </select>
            </div>
            <button className={btnGhost} type="submit">Save</button>
          </form>
          {consent.slice(0, 20).map((c) => (
            <div key={c._id} className="flex justify-between gap-3 border-b border-[#F0F0F0] py-2 text-[12px]">
              <span className="text-[#333333]">{c.phone}</span>
              <span className="text-[#AAAAAA]">{c.channel} · {c.status}</span>
            </div>
          ))}
        </section>
        <section>
          <p className="adm-index">03 — Delivery log</p>
          {log.length === 0 ? (
            <p className="border-y border-[#EAEAEA] py-6 text-[12px] text-[#AAAAAA]">No messages logged.</p>
          ) : log.map((l) => (
            <div key={l._id} className="border-b border-[#F0F0F0] py-2 text-[12px]">
              <span className="text-[#333333]">{l.channel} → {l.to}</span>
              <span className="ml-2 text-[#AAAAAA]">{l.status} · {l.templateKey}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Risk({ token, toast }) {
  const [orders, setOrders] = useState(null);
  const load = () => api('/ops/risk', { token }).then((d) => setOrders(d.orders || [])).catch(() => setOrders([]));
  useEffect(load, [token]);
  const review = async (id, status) => {
    try { await api(`/ops/risk/${id}/review`, { method: 'POST', token, body: { status } }); toast(status); load(); }
    catch (ex) { toast(ex.message); }
  };
  if (!orders) return <TableSkeleton rows={5} />;
  return (
    <section>
      <p className="adm-index">01 — Risk</p>
      {orders.length === 0 ? (
        <EditorialEmpty title="No flagged orders" description="Holds appear here when risk signals fire." />
      ) : (
        <>
          <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[0.7fr_0.6fr_minmax(0,1.4fr)_auto] md:gap-3">
            {['Order', 'Value', 'Signals', ''].map((h) => <p key={h || 'a'} className="adm-label">{h}</p>)}
          </div>
          {orders.map((o) => (
            <div key={o._id} className="grid grid-cols-1 gap-2 border-b border-[#EAEAEA] py-4 md:grid-cols-[0.7fr_0.6fr_minmax(0,1.4fr)_auto] md:items-center md:gap-3">
              <div>
                <p className="text-[13px] text-black">{o.orderNumber}</p>
                <p className="text-[11px] text-[#AAAAAA]">{o.paymentMethod} · score {o.fraudFilter?.score ?? '—'}</p>
              </div>
              <span className="text-[13px] tabular-nums text-black">{pkr(o.total)}</span>
              <span className="text-[12px] text-[#999999]">{(o.fraudFilter?.reasons || []).join(' · ') || '—'}</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={() => review(o._id, 'approved')}>Approve</button>
                <button type="button" className={btnGhost} onClick={() => review(o._id, 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
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
    <div>
      <section className="mb-10">
        <p className="adm-index">01 — Profiles</p>
        {list.length === 0 ? (
          <EditorialEmpty title="No shipping profiles" description="Save a zone below." />
        ) : (
          <>
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[minmax(0,1.2fr)_0.6fr_0.6fr_0.5fr] md:gap-3">
              {['Profile', 'Courier', 'Countries', 'Methods'].map((h) => <p key={h} className="adm-label">{h}</p>)}
            </div>
            {list.map((p) => (
              <div key={p._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[minmax(0,1.2fr)_0.6fr_0.6fr_0.5fr] md:gap-3">
                <span className="text-[13px] text-black">{p.name}</span>
                <span className="text-[12px] text-[#777777]">{p.courier}</span>
                <span className="text-[12px] text-[#999999]">{(p.countries || []).join(', ')}</span>
                <span className="text-[12px] tabular-nums text-[#777777]">{p.methods?.length || 0}</span>
              </div>
            ))}
          </>
        )}
      </section>
      <section>
        <p className="adm-index">02 — New zone / method</p>
        <form onSubmit={save} className="grid gap-3 border-y border-[#EAEAEA] py-6 md:grid-cols-2">
          <div><label className="adm-label mb-1.5 block">Name</label><input className={ctl} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="adm-label mb-1.5 block">Countries ISO</label><input className={ctl} placeholder="PK,AE" value={f.countries} onChange={(e) => setF({ ...f, countries: e.target.value })} /></div>
          <div><label className="adm-label mb-1.5 block">Courier</label><input className={ctl} value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })} /></div>
          <div><label className="adm-label mb-1.5 block">Rate</label><input className={ctl} type="number" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></div>
          <div>
            <label className="adm-label mb-1.5 block">Type</label>
            <select className={ctl} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="flat">Flat</option><option value="free">Free</option>
              <option value="pickup">Pickup</option><option value="local">Local delivery</option>
              <option value="weight">Weight</option>
            </select>
          </div>
          <div className="flex items-end"><button className={btnSolid} type="submit">Save profile</button></div>
        </form>
      </section>
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
    <div>
      <section className="mb-10">
        <p className="adm-index">01 — Tax zones</p>
        {zones.length === 0 ? (
          <EditorialEmpty title="No tax zones" description="Save a zone below." />
        ) : (
          <>
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[minmax(0,1.2fr)_0.4fr_0.4fr_0.6fr] md:gap-3">
              {['Zone', 'Country', 'Rate', 'Status'].map((h) => <p key={h} className="adm-label">{h}</p>)}
            </div>
            {zones.map((z) => (
              <div key={z._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[minmax(0,1.2fr)_0.4fr_0.4fr_0.6fr] md:gap-3">
                <span className="text-[13px] text-black">{z.name}</span>
                <span className="text-[12px] text-[#999999]">{z.country}</span>
                <span className="text-[13px] tabular-nums text-[#333333]">{z.rate}%</span>
                <MonoStatus label={z.inclusive ? 'INCLUSIVE' : 'EXCLUSIVE'} dim={false} />
              </div>
            ))}
          </>
        )}
      </section>
      <section>
        <p className="adm-index">02 — New zone</p>
        <form onSubmit={save} className="grid gap-3 border-y border-[#EAEAEA] py-6 md:grid-cols-2">
          <div><label className="adm-label mb-1.5 block">Name</label><input className={ctl} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="adm-label mb-1.5 block">Country ISO</label><input className={ctl} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
          <div><label className="adm-label mb-1.5 block">Rate</label><input className={ctl} type="number" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></div>
          <div className="space-y-3 self-end">
            <label className="flex items-center gap-2 text-[13px] text-[#555555]"><input type="checkbox" className="accent-white" checked={f.inclusive} onChange={(e) => setF({ ...f, inclusive: e.target.checked })} /> Inclusive</label>
            <label className="flex items-center gap-2 text-[13px] text-[#555555]"><input type="checkbox" className="accent-white" checked={f.appliesToShipping} onChange={(e) => setF({ ...f, appliesToShipping: e.target.checked })} /> Tax shipping</label>
          </div>
          <div><button className={btnSolid} type="submit">Save zone</button></div>
        </form>
      </section>
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
    <div>
      <section className="mb-10">
        <p className="adm-index">01 — Launches</p>
        {list.length === 0 ? (
          <EditorialEmpty title="No launches" description="Save a draft campaign below." />
        ) : (
          list.map((l, i) => (
            <div key={l._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] py-4">
              <div>
                <p className="text-[13px] text-black">
                  <span className="mr-3 text-[10px] uppercase tracking-[0.16em] text-[#AAAAAA]">{String(i + 1).padStart(2, '0')}</span>
                  {l.name}
                </p>
                <p className="mt-1 text-[12px] text-[#AAAAAA]">{l.productIds?.length || 0} products · {l.discountCode || 'no coupon'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MonoStatus label={l.status} dim={l.status === 'ended' || l.status === 'draft'} />
                {l.status !== 'live' && l.status !== 'ended' && <button type="button" className={btnGhost} onClick={() => go(l._id, 'go-live')}>Go live</button>}
                {l.status === 'live' && <button type="button" className={btnGhost} onClick={() => go(l._id, 'end')}>End</button>}
              </div>
            </div>
          ))
        )}
      </section>
      <section>
        <p className="adm-index">02 — New campaign</p>
        <form onSubmit={save} className="space-y-3 border-y border-[#EAEAEA] py-6">
          <div><label className="adm-label mb-1.5 block">Name</label><input className={ctl} placeholder="BLACK FRIDAY" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="adm-label mb-1.5 block">Starts</label><input className={`${ctl} [color-scheme:dark]`} type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></div>
            <div><label className="adm-label mb-1.5 block">Ends</label><input className={`${ctl} [color-scheme:dark]`} type="datetime-local" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} /></div>
          </div>
          <div><label className="adm-label mb-1.5 block">Coupon code (optional)</label><input className={ctl} value={f.discountCode} onChange={(e) => setF({ ...f, discountCode: e.target.value })} /></div>
          <div><label className="adm-label mb-1.5 block">Banner note</label><input className={ctl} value={f.bannerNote} onChange={(e) => setF({ ...f, bannerNote: e.target.value })} /></div>
          <div>
            <p className="adm-label mb-2">Products</p>
            <div className="max-h-40 overflow-auto border-y border-[#EAEAEA] py-2 text-[12px]">
              {products.map((p) => (
                <label key={p._id} className="flex items-center gap-2 py-1.5 text-white/75">
                  <input type="checkbox" className="accent-white" checked={f.productIds.includes(p._id)} onChange={() => toggleP(p._id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <button className={btnSolid} type="submit">Save draft</button>
        </form>
      </section>
    </div>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select className={ctl} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}
