import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Loader2, Mail, MessageCircle, Pencil, Phone, Plus, Save, ShoppingBag, Tag, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, ctl, ctlInline, EditorialEmpty, EditorialError, MonoStatus, TableSkeleton } from './orders/orderUi';

const TABS = [
  ['overview', 'Overview'], ['orders', 'Orders'], ['activity', 'Activity'], ['wishlist', 'Wishlist'],
  ['cart', 'Cart'], ['reviews', 'Reviews'], ['loyalty', 'Loyalty'], ['notes', 'Notes'],
];
const CONSENT = ['OPTED_IN', 'OPTED_OUT', 'UNKNOWN'];
const when = (date, withTime = false) => (date ? (withTime ? fmtDateTime(date) : fmtDate(date)) : '—');
const phoneForWhatsApp = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return digits.startsWith('92') ? digits : `92${digits}`;
};

function Metric({ label, value, hint }) {
  return <div className="px-4 py-4"><p className="adm-label">{label}</p><p className="adm-metric mt-2 text-[22px] text-black">{value}</p>{hint && <p className="mt-1 text-[10px] text-[#777777]">{hint}</p>}</div>;
}

function ConsentSelect({ label, value, onChange, busy }) {
  return (
    <label className="flex items-center justify-between gap-4 border-b border-[#EAEAEA] py-3 last:border-0">
      <span className="text-[12px] text-[#555555]">{label}</span>
      <select value={value || 'UNKNOWN'} disabled={busy} onChange={(event) => onChange(event.target.value)} className={ctlInline}>
        {CONSENT.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
      </select>
    </label>
  );
}

function ActivityLabel({ item }) {
  const map = {
    product_viewed: 'Product viewed', added_to_cart: 'Added to cart', wishlist_added: 'Wishlist',
    checkout_started: 'Checkout started', purchase: 'Purchase', abandoned_cart: 'Abandoned cart',
  };
  return map[item.type] || item.type;
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth, toast } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [orders, setOrders] = useState(null);
  const [activity, setActivity] = useState(null);
  const [notes, setNotes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteCategory, setNoteCategory] = useState('general');
  const [editing, setEditing] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const load = async () => {
    setError('');
    try {
      const profile = await api(`/customers/${id}`, { token: auth?.token, noCache: true });
      setData(profile); setOrders({ orders: profile.orders, summary: profile.customer.orderSummary });
      setActivity({ activity: profile.activity }); setNotes({ notes: profile.notes });
    } catch (err) { setError(err.message || 'Customer profile could not load.'); }
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const customer = data?.customer;
  const address = customer?.deliveryAddress || {};
  const whatsapp = phoneForWhatsApp(customer?.whatsApp || customer?.phone);
  const marketingPermitted = customer?.consent?.email === 'OPTED_IN';
  const editInitial = useMemo(() => ({
    name: customer?.name || '', email: customer?.email || '', phone: customer?.phone || '', whatsApp: customer?.whatsApp || '', country: customer?.country || '',
    address: address.address || '', city: address.city || '', province: address.province || '', postalCode: address.postalCode || '',
  }), [customer, address.address, address.city, address.province, address.postalCode]);
  const [editForm, setEditForm] = useState(editInitial);
  useEffect(() => { setEditForm(editInitial); }, [editInitial]);

  const loadTab = async (next) => {
    setTab(next);
    try {
      if (next === 'orders' && (!orders || !orders.pages)) setOrders(await api(`/customers/${id}/orders`, { token: auth?.token, noCache: true }));
      if (next === 'activity' && (!activity || !activity.pages)) setActivity(await api(`/customers/${id}/activity`, { token: auth?.token, noCache: true }));
      if (next === 'notes' && (!notes || !notes.pages)) setNotes(await api(`/customers/${id}/notes`, { token: auth?.token, noCache: true }));
    } catch (err) { toast(err.message || 'Tab data load nahi ho saka'); }
  };

  const addTag = async () => {
    if (!tagDraft.trim()) return;
    setBusy(true);
    try {
      const result = await api(`/customers/${id}/tags`, { method: 'POST', token: auth?.token, body: { tag: tagDraft } });
      setData((current) => ({ ...current, customer: { ...current.customer, tags: result.tags } }));
      setTagDraft(''); toast('Tag add ho gaya');
    } catch (err) { toast(err.message || 'Tag add nahi ho saka'); }
    setBusy(false);
  };

  const removeTag = async (tag) => {
    setBusy(true);
    try {
      const result = await api(`/customers/${id}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE', token: auth?.token });
      setData((current) => ({ ...current, customer: { ...current.customer, tags: result.tags } }));
    } catch (err) { toast(err.message || 'Tag remove nahi ho saka'); }
    setBusy(false);
  };

  const addNote = async () => {
    if (!noteDraft.trim()) { toast('Internal note likhein'); return; }
    setBusy(true);
    try {
      const result = await api(`/customers/${id}/notes`, { method: 'POST', token: auth?.token, body: { content: noteDraft, category: noteCategory } });
      setNotes((current) => ({ ...(current || {}), notes: [result.note, ...(current?.notes || [])] }));
      setNoteDraft(''); toast('Internal note save ho gaya');
    } catch (err) { toast(err.message || 'Note save nahi ho saka'); }
    setBusy(false);
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      const result = await api(`/customers/${id}`, {
        method: 'PATCH', token: auth?.token,
        body: {
          name: editForm.name, email: editForm.email, phone: editForm.phone, whatsApp: editForm.whatsApp, country: editForm.country,
          address: { address: editForm.address, city: editForm.city, province: editForm.province, postalCode: editForm.postalCode },
        },
      });
      setData((current) => ({ ...current, customer: { ...current.customer, ...result.customer } }));
      setEditing(false); toast('Customer profile update ho gaya — purane order snapshots nahi badle');
    } catch (err) { toast(err.message || 'Profile update nahi ho saka'); }
    setBusy(false);
  };

  const updateConsent = async (key, value) => {
    setBusy(true);
    try {
      const result = await api(`/customers/${id}/consent`, { method: 'PUT', token: auth?.token, body: { [key]: value } });
      setData((current) => ({ ...current, customer: { ...current.customer, consent: { ...current.customer.consent, ...result.consent } } }));
      toast('Consent record update ho gaya');
    } catch (err) { toast(err.message || 'Consent update nahi ho saka'); }
    setBusy(false);
  };

  const sendMarketingEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) { toast('Subject aur message lazmi hain'); return; }
    setBusy(true);
    try {
      const result = await api(`/customers/${id}/contact/email`, {
        method: 'POST', token: auth?.token, body: { kind: 'marketing', subject: emailSubject, message: emailMessage },
      });
      toast(result.message || 'Email request complete');
      if (result.acceptedByProvider) { setEmailSubject(''); setEmailMessage(''); setContactOpen(false); }
    } catch (err) { toast(err.message || 'Email send nahi ho saka'); }
    setBusy(false);
  };

  if (error) return <AdminLayout title="Customer 360"><EditorialError title="Customer profile unavailable" description={error} onRetry={load} /></AdminLayout>;
  if (!data) return <AdminLayout title="Customer 360"><TableSkeleton rows={8} /></AdminLayout>;

  return (
    <AdminLayout title={customer.name || 'Customer 360'}>
      <PageHeader
        eyebrow="Customer 360"
        title={customer.name || 'Customer'}
        description={`${customer.engagement.reason}. Customer ID: ${customer.id}`}
        actions={(
          <div className="hidden md:contents">
            <button type="button" onClick={() => navigate(-1)} className={btnGhost}><ArrowLeft size={12} /> Back</button>
            <button type="button" onClick={() => loadTab('orders')} className={btnGhost}>View orders</button>
            <button type="button" onClick={() => setContactOpen((open) => !open)} className={btnGhost}><Mail size={12} /> Contact</button>
            <button type="button" onClick={() => loadTab('notes')} className={btnGhost}><Plus size={12} /> Add note</button>
            <button type="button" onClick={() => setEditing((value) => !value)} className={btnGhost}><Pencil size={12} /> Edit</button>
            <Link to={`/admin/orders/new?customer=${customer.id}`} className={btnSolid}><ShoppingBag size={12} /> Create manual order</Link>
          </div>
        )}
      />

      {/* Mobile gets a compact, scroll-safe action strip rather than six
          desktop buttons fighting for one narrow header row. */}
      <div className="sticky top-[56px] z-20 -mx-4 mb-4 flex gap-2 overflow-x-auto border-y border-[#EAEAEA] bg-white px-4 py-2 md:hidden">
        <button type="button" onClick={() => navigate(-1)} className={`${btnGhost} shrink-0`}><ArrowLeft size={11} /> Back</button>
        <button type="button" onClick={() => loadTab('orders')} className={`${btnGhost} shrink-0`}>Orders</button>
        <button type="button" onClick={() => setContactOpen((open) => !open)} className={`${btnGhost} shrink-0`}><Mail size={11} /> Contact</button>
        <button type="button" onClick={() => loadTab('notes')} className={`${btnGhost} shrink-0`}>Note</button>
        <Link to={`/admin/orders/new?customer=${customer.id}`} className={`${btnSolid} shrink-0`}>Manual order</Link>
      </div>

      <section className="sticky top-[56px] z-10 mb-8 border-y border-[#EAEAEA] bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[15px] font-medium text-black">{customer.name}</p><MonoStatus label={customer.accountStatus} dim={customer.accountStatus !== 'ACTIVE'} /><MonoStatus label={customer.engagement.label} dim={customer.engagement.key === 'all' || customer.engagement.key === 'inactive'} /></div><p className="mt-1 truncate text-[12px] text-[#555555]">{customer.email || 'No email'} · {customer.phone || 'No phone'}{customer.whatsApp ? ` · WhatsApp ${customer.whatsApp}` : ''}</p><p className="mt-1 text-[11px] text-[#777777]">{customer.country || 'Country unknown'} · Joined {when(customer.joinedAt)} · Last order {when(customer.metrics.lastOrderAt)}</p></div>
          <div className="flex flex-wrap gap-2">
            {customer.phone && <a href={`tel:${customer.phone}`} className={btnGhost}><Phone size={11} /> Call</a>}
            {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className={btnGhost}><MessageCircle size={11} /> WhatsApp</a>}
          </div>
        </div>
        <div className="adm-divide-x grid grid-cols-3 border-t border-[#EAEAEA] md:grid-cols-5"><Metric label="Total orders" value={customer.metrics.orders} /><Metric label="LTV" value={pkr(customer.metrics.ltv)} /><Metric label="AOV" value={customer.metrics.orders ? pkr(customer.metrics.aov) : '—'} /><Metric label="Joined" value={when(customer.joinedAt)} /><Metric label="Last order" value={when(customer.metrics.lastOrderAt)} /></div>
      </section>

      {contactOpen && (
        <section className="mb-8 border-y border-[#EAEAEA] py-5">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="adm-index">Contact</p><p className="text-[12px] text-[#777777]">WhatsApp aur call browser link hain. Marketing email sirf explicit OPTED IN par provider ko submit hoti hai.</p></div><button type="button" onClick={() => setContactOpen(false)} className={btnGhost}><X size={12} /> Close</button></div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="border border-[#EAEAEA] p-4"><p className="adm-label">Marketing email</p><p className="mt-2 text-[12px] text-[#555555]">Consent: <b className="text-black">{customer.consent.email}</b></p>{marketingPermitted ? <><input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} placeholder="Subject" className={`${ctl} mt-3`} /><textarea value={emailMessage} onChange={(event) => setEmailMessage(event.target.value)} placeholder="Internal staff message to customer…" className={`${ctl} mt-2 min-h-24 !h-auto py-2`} /><button type="button" disabled={busy} onClick={sendMarketingEmail} className={`${btnSolid} mt-3`}>{busy ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />} Submit to email provider</button></> : <p className="mt-3 text-[12px] text-[#777777]">Marketing email disabled — consent unknown ya opted out hai.</p>}</div><div className="border border-[#EAEAEA] p-4"><p className="adm-label">Order-specific WhatsApp</p><p className="mt-2 text-[12px] text-[#555555]">Har order row se specific message khol sakte hain. Link send/delivery confirm nahi karta.</p>{orders?.orders?.[0] && whatsapp && <a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi ${customer.name || ''}, HUSHAE order ${orders.orders[0].orderNumber} ke hawale se rabta kar raha hai.`)}`} className={`${btnGhost} mt-3`}>Latest order WhatsApp <ExternalLink size={11} /></a>}</div></div>
        </section>
      )}

      <nav className="mb-7 flex gap-5 overflow-x-auto border-b border-[#EAEAEA]" aria-label="Customer profile tabs">
        {TABS.map(([key, label]) => <button key={key} type="button" onClick={() => loadTab(key)} className={`shrink-0 border-b py-3 text-[10px] font-medium uppercase tracking-[0.14em] ${tab === key ? 'border-black text-black' : 'border-transparent text-[#777777] hover:text-black'}`}>{label}</button>)}
      </nav>

      {tab === 'overview' && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-8">
            <section><p className="adm-index">Overview</p><div className="grid gap-6 border-y border-[#EAEAEA] py-5 md:grid-cols-2"><div><p className="adm-label">Active delivery address</p>{address.address ? <div className="mt-2 text-[13px] leading-relaxed text-[#555555]"><p className="text-black">{address.name || customer.name}</p><p>{address.address}</p><p>{address.city}{address.province ? `, ${address.province}` : ''} {address.postalCode || ''}</p><p>{address.country || customer.country || 'Country unknown'}</p></div> : <p className="mt-2 text-[12px] text-[#777777]">No profile delivery address saved.</p>}</div><div><p className="adm-label">Order summary</p><dl className="mt-2 space-y-2 text-[12px]">{[['Total', customer.orderSummary.total], ['Completed', customer.orderSummary.completed], ['Cancelled', customer.orderSummary.cancelled], ['Refunded', customer.orderSummary.refunded], ['Revenue', pkr(customer.orderSummary.revenue)]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#F0F0F0] pb-2"><dt className="text-[#777777]">{label}</dt><dd className="text-black">{value}</dd></div>)}</dl></div></div></section>
            <section><p className="adm-index">Internal tags</p><div className="flex flex-wrap items-center gap-2 border-y border-[#EAEAEA] py-4">{customer.tags.length ? customer.tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 border border-[#D8D8D8] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-black">{tag}<button type="button" disabled={busy} onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`} className="text-[#777777] hover:text-black"><X size={10} /></button></span>) : <p className="text-[12px] text-[#777777]">No tags yet.</p>}<input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} placeholder="VIP, Bridal…" className={`${ctl} !w-32`} /><button type="button" disabled={busy} onClick={addTag} className={btnGhost}><Tag size={11} /> Add</button></div></section>
            <section><p className="adm-index">Loyalty snapshot</p><div className="border-y border-[#EAEAEA] py-4">{data.loyalty ? <div className="grid grid-cols-3 gap-4"><Metric label="Tier" value={data.loyalty.tier || '—'} /><Metric label="Points" value={data.loyalty.points.toLocaleString()} /><Metric label="Store credit" value={pkr(data.loyalty.storeCredit)} /></div> : <p className="text-[12px] text-[#777777]">No linked loyalty account.</p>}</div></section>
          </div>
          <aside className="space-y-7"><section><p className="adm-index">Consent</p><div className="border-y border-[#EAEAEA]"><ConsentSelect label="Marketing email" value={customer.consent.email} busy={busy} onChange={(value) => updateConsent('email', value)} /><ConsentSelect label="WhatsApp" value={customer.consent.whatsapp} busy={busy} onChange={(value) => updateConsent('whatsapp', value)} /><ConsentSelect label="SMS" value={customer.consent.sms} busy={busy} onChange={(value) => updateConsent('sms', value)} /></div></section><section><p className="adm-index">Engagement</p><div className="border-y border-[#EAEAEA] py-4"><MonoStatus label={customer.engagement.label} dim={customer.engagement.key === 'all' || customer.engagement.key === 'inactive'} /><p className="mt-3 text-[12px] leading-relaxed text-[#555555]">{customer.engagement.reason}</p></div></section></aside>
        </div>
      )}

      {tab === 'orders' && <OrdersTab orders={orders?.orders || []} summary={orders?.summary || customer.orderSummary} customer={customer} whatsapp={whatsapp} />}
      {tab === 'activity' && <ActivityTab activity={activity?.activity || []} />}
      {tab === 'wishlist' && <WishlistTab wishlist={data.wishlist || []} />}
      {tab === 'cart' && <CartTab cart={data.cart} />}
      {tab === 'reviews' && <ReviewsTab reviews={data.reviews || []} />}
      {tab === 'loyalty' && <LoyaltyTab loyalty={data.loyalty} />}
      {tab === 'notes' && <NotesTab notes={notes?.notes || []} draft={noteDraft} category={noteCategory} busy={busy} setDraft={setNoteDraft} setCategory={setNoteCategory} addNote={addNote} />}

      {editing && <EditPanel form={editForm} setForm={setEditForm} busy={busy} onCancel={() => { setEditForm(editInitial); setEditing(false); }} onSave={saveProfile} />}
    </AdminLayout>
  );
}

function OrdersTab({ orders, summary, customer, whatsapp }) {
  return <section><p className="adm-index">Orders</p><div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] md:grid-cols-4"><Metric label="Total" value={summary.total || 0} /><Metric label="Revenue" value={pkr(summary.revenue || 0)} /><Metric label="AOV" value={summary.aov ? pkr(summary.aov) : '—'} /><Metric label="Last order" value={when(summary.lastOrderAt)} /></div>{orders.length ? <div className="mt-5 border-y border-[#EAEAEA]"><div className="hidden grid-cols-[110px_120px_minmax(160px,1fr)_100px_100px_115px_100px_auto] gap-3 border-b border-[#EAEAEA] py-3 md:grid">{['Order', 'Date', 'Items', 'Total', 'Payment', 'Order status', 'Production', 'Shipping'].map((label) => <p key={label} className="adm-label">{label}</p>)}</div>{orders.map((order) => <div key={order.id} className="grid gap-2 border-b border-[#EAEAEA] py-4 last:border-0 md:grid-cols-[110px_120px_minmax(160px,1fr)_100px_100px_115px_100px_auto] md:items-center md:gap-3"><Link to={`/admin/orders/${order.id}`} className="font-mono text-[12px] text-black hover:underline">{order.orderNumber}</Link><p className="text-[11px] text-[#777777]">{when(order.createdAt)}</p><p className="text-[12px] text-[#555555]">{order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {order.items.map((item) => item.name).join(', ')}</p><p className="text-[12px] text-black">{pkr(order.total)}</p><p className="text-[11px] text-[#555555]">{order.paymentStatus}</p><MonoStatus label={order.orderStatus} dim={['Cancelled', 'Refunded', 'Pending'].includes(order.orderStatus)} /><p className="text-[11px] text-[#555555]">{order.productionStatus || '—'}</p><div className="flex items-center gap-2"><p className="text-[11px] text-[#555555]">{order.shippingStatus}</p>{whatsapp && <a target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-[0.1em] text-[#777777] hover:text-black" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi ${customer.name || ''}, HUSHAE order ${order.orderNumber} ke hawale se rabta kar raha hai.`)}`}>WA</a>}</div></div>)}</div> : <EditorialEmpty title="No linked orders" description="Sirf persistent customer ID se linked commerce orders yahan show hote hain." />}</section>;
}
function ActivityTab({ activity }) { return <section><p className="adm-index">Activity</p><p className="mb-4 text-[12px] text-[#777777]">Sirf real persisted events. Anonymous history ya fabricated timeline include nahi hoti.</p>{activity.length ? <div className="border-y border-[#EAEAEA]">{activity.map((item) => <div key={item.id} className="flex gap-4 border-b border-[#EAEAEA] py-4 last:border-0"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-black" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[13px] text-black"><ActivityLabel item={item} />{item.objectLabel ? ` · ${item.objectLabel}` : ''}</p><p className="text-[11px] text-[#777777]">{when(item.createdAt, true)}</p></div><p className="mt-1 text-[11px] text-[#777777]">{item.source} · {item.device}{item.metadata?.itemCount ? ` · ${item.metadata.itemCount} items` : ''}</p></div></div>)}</div> : <EditorialEmpty title="No attributable activity" description="Activity tab tabhi populate hota hai jab signed-in customer ka real event persist hua ho." />}</section>; }
function WishlistTab({ wishlist }) { return <section><p className="adm-index">Wishlist</p>{wishlist.length ? <div className="grid gap-px border-y border-[#EAEAEA] sm:grid-cols-2 lg:grid-cols-3">{wishlist.map((product) => <Link key={product.id} to={`/product/${product.slug}`} target="_blank" className="flex gap-3 p-4 hover:bg-[#F7F7F7]"><div className="h-14 w-11 shrink-0 bg-[#F0F0F0]">{product.image && <img src={product.image} alt="" className="h-full w-full object-cover" />}</div><div><p className="text-[13px] text-black">{product.name}</p><p className="mt-1 text-[12px] text-[#555555]">{pkr(product.price)}</p><p className="mt-1 text-[10px] text-[#777777]">{product.available ? 'Available' : 'Unavailable'}</p></div></Link>)}</div> : <EditorialEmpty title="No wishlist" description="Admin yahan wishlist observe kar sakta hai; storefront wishlist items edit nahi karta." />}</section>; }
function CartTab({ cart }) { return <section><p className="adm-index">Abandoned cart</p>{cart ? <div className="border-y border-[#EAEAEA] py-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-[14px] text-black">{cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} · {pkr(cart.subtotal)}</p><p className="mt-1 text-[12px] text-[#777777]">Last captured {when(cart.lastSeenAt, true)}</p></div><Link to="/admin/abandoned-carts" className={btnGhost}>Open carts desk</Link></div><div className="mt-4 divide-y divide-[#EAEAEA]">{cart.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between py-2 text-[12px]"><span className="text-[#555555]">{item.name} × {item.quantity}</span><span className="text-black">{pkr((item.price || 0) * (item.quantity || 0))}</span></div>)}</div></div> : <EditorialEmpty title="No linked abandoned cart" description="Anonymous carts ko guessing se customer profile par attach nahi kiya jata." />}</section>; }
function ReviewsTab({ reviews }) { return <section><p className="adm-index">Reviews</p>{reviews.length ? <div className="border-y border-[#EAEAEA]">{reviews.map((review) => <div key={review.id} className="border-b border-[#EAEAEA] py-4 last:border-0"><div className="flex flex-wrap justify-between gap-3"><p className="text-[13px] text-black">{review.product?.name || 'Product'} · {review.rating}/5</p><MonoStatus label={review.status} dim={review.status !== 'approved'} /></div>{review.title && <p className="mt-2 text-[12px] text-black">{review.title}</p>}<p className="mt-1 text-[12px] leading-relaxed text-[#555555]">{review.body}</p><p className="mt-2 text-[11px] text-[#777777]">{when(review.createdAt)}</p></div>)}</div> : <EditorialEmpty title="No reviews" description="Existing review system mein is customer ki koi review nahi mili." />}</section>; }
function LoyaltyTab({ loyalty }) { return <section><p className="adm-index">Loyalty</p>{loyalty ? <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] md:grid-cols-4"><Metric label="Tier" value={loyalty.tier || '—'} /><Metric label="Points" value={loyalty.points.toLocaleString()} /><Metric label="Store credit" value={pkr(loyalty.storeCredit)} /><Metric label="Referrals" value={loyalty.referralCount} /></div> : <EditorialEmpty title="No loyalty account" description="Loyalty engine reuse hota hai; Phase 4 ne koi naya point system nahi banaya." />}</section>; }
function NotesTab({ notes, draft, category, busy, setDraft, setCategory, addNote }) { return <section><p className="adm-index">Internal notes</p><div className="grid gap-5 border-y border-[#EAEAEA] py-5 lg:grid-cols-[1fr_240px]"><div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} className={`${ctl} min-h-28 !h-auto py-3`} placeholder="Internal only — customer storefront par kabhi visible nahi hoga." /><div className="mt-3 flex justify-end"><button type="button" disabled={busy} onClick={addNote} className={btnSolid}>{busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Save internal note</button></div></div><div><label className="adm-label mb-1 block">Category</label><select value={category} onChange={(event) => setCategory(event.target.value)} className={ctlInline}>{['general', 'service', 'fit', 'order', 'other'].map((item) => <option key={item} value={item}>{item}</option>)}</select><p className="mt-3 text-[11px] leading-relaxed text-[#777777]">Notes append-only hain. Correction ke liye naya note add karein.</p></div></div>{notes.length ? <div className="border-b border-[#EAEAEA]">{notes.map((note) => <div key={note.id} className="border-t border-[#EAEAEA] py-4"><p className="text-[13px] leading-relaxed text-black">{note.content}</p><p className="mt-2 text-[11px] text-[#777777]">{note.category} · {note.createdByName} · {when(note.createdAt, true)}</p></div>)}</div> : <p className="py-8 text-[12px] text-[#777777]">No internal notes yet.</p>}</section>; }
function EditPanel({ form, setForm, busy, onCancel, onSave }) { const update = (key, value) => setForm((current) => ({ ...current, [key]: value })); return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-4 sm:p-8"><div className="mx-auto max-w-2xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between gap-4 border-b border-[#EAEAEA] pb-4"><div><p className="adm-index">Edit profile</p><p className="text-[12px] text-[#777777]">Active delivery profile update hoga; historic order address snapshots change nahi honge.</p></div><button type="button" onClick={onCancel} className={btnGhost}><X size={12} /></button></div><div className="grid gap-4 py-5 sm:grid-cols-2">{[['Name', 'name'], ['Email', 'email'], ['Phone', 'phone'], ['WhatsApp', 'whatsApp'], ['Country (ISO)', 'country'], ['Address', 'address'], ['City', 'city'], ['Province', 'province'], ['Postal code', 'postalCode']].map(([label, key]) => <label key={key} className={key === 'address' ? 'sm:col-span-2' : ''}><span className="adm-label mb-1 block">{label}</span><input value={form[key]} onChange={(event) => update(key, event.target.value)} className={ctl} /></label>)}</div><div className="flex justify-end gap-2 border-t border-[#EAEAEA] pt-4"><button type="button" onClick={onCancel} className={btnGhost}>Cancel</button><button type="button" disabled={busy} onClick={onSave} className={btnSolid}>{busy ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save profile</button></div></div></div>; }
