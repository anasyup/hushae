import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, LayoutGrid, LogOut, MapPin, Package, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import { accountConfig } from '../lib/accountConfig';
import AuthCard from './account/AuthCard';
import ProfilePanel from './account/ProfilePanel';
import AddressPanel from './account/AddressPanel';
import SecurityPanel from './account/SecurityPanel';

/* ============================================================================
 * CUSTOMER ACCOUNT
 *
 * Mobile-first: ~85% of this store's customers are on a phone, so the default
 * layout is a single column with a horizontally scrollable section rail. The
 * two-column sidebar only appears from lg upwards.
 *
 * Configuration comes from settings.account (what the merchant wants) merged
 * with /auth/policy (what the server can actually do). They differ on email:
 * the merchant can switch reset-by-email on, but if no SMTP transport is
 * configured the server refuses, and the UI must follow the server or it will
 * promise emails that never arrive.
 * ========================================================================== */

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

export default function Account() {
  const { auth, logout, settings, patchUser, toast } = useApp();
  const nav = useNavigate();

  const [policy, setPolicy] = useState(null);
  const cfg = useMemo(() => accountConfig(settings, policy), [settings, policy]);

  const [section, setSection] = useState('overview');
  const [orders, setOrders] = useState(null);
  const [user, setUser] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const headingRef = useRef(null);

  /* The server's real capabilities. Fetched once, for signed-out and
     signed-in alike, because the sign-in form needs it too. */
  useEffect(() => {
    let alive = true;
    api('/auth/policy')
      .then((p) => { if (alive) setPolicy(p); })
      .catch(() => { if (alive) setPolicy({}); });   // {} still marks it "loaded"
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!auth?.token) { setUser(null); setOrders(null); return undefined; }
    let alive = true;
    setLoadErr('');
    api('/customer/profile', { token: auth.token })
      .then((d) => { if (alive) setUser(d.user); })
      .catch((e) => { if (alive) setLoadErr(e.message || 'Could not load your account'); });
    api('/customer/orders', { token: auth.token })
      .then((d) => { if (alive) setOrders(d.orders || []); })
      .catch(() => { if (alive) setOrders([]); });
    return () => { alive = false; };
  }, [auth?.token]);

  /* Keep the header/global user in step with anything a panel changes. */
  const onUpdated = useCallback((u) => { setUser(u); patchUser(u); }, [patchUser]);

  const go = (id) => {
    setSection(id);
    // Move focus to the panel heading so a screen reader announces the change
    // instead of leaving focus on a nav button that no longer describes the view.
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  /* ---------------- signed out ---------------- */
  if (!auth) {
    return (
      <div className="container-page py-sect-y md:py-sect-y-lg">
        <div className="text-center">
          <h1 className="font-display text-h1">{cfg.signInTitle}</h1>
          <p className="mx-auto mt-3 max-w-md text-body text-ash">{cfg.signInSubtitle}</p>
        </div>
        <AuthCard cfg={cfg} policyLoaded={policy !== null} />
      </div>
    );
  }

  /* ---------------- loading ---------------- */
  if (!user) {
    return (
      <div className="container-page py-sect-y">
        {loadErr ? (
          <div className="mx-auto max-w-md text-center">
            <h1 className="font-display text-h3">We could not load your account</h1>
            <p className="mt-3 text-body-sm text-ash">{loadErr}</p>
            <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-6">Try again</button>
          </div>
        ) : (
          <div role="status" aria-live="polite">
            <span className="sr-only">Loading your account…</span>
            <div className="skeleton h-28 w-full rounded-panel" />
            <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="skeleton h-56 w-full rounded-card" />
              <div className="skeleton h-96 w-full rounded-card" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'there';
  const initials = (user.name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const defaultAddr = (user.addresses || []).find((a) => a.isDefault) || (user.addresses || [])[0];
  const activeLabel = SECTIONS.find((s) => s.id === section)?.label || '';

  return (
    <div className="container-page py-8 md:py-12">
      {/* ---------------- welcome ---------------- */}
      <header className="rounded-panel border border-line bg-white/60 p-5 md:p-7">
        <div className="flex flex-wrap items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full border border-line object-cover md:h-16 md:w-16" />
          ) : (
            <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-cream font-display text-h6 text-graphite md:h-16 md:w-16">
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-label uppercase tracking-widest text-sagedeep">{cfg.welcomeGreeting}</p>
            <h1 className="mt-0.5 truncate font-display text-h2">{firstName}</h1>
            <p className="mt-1 truncate text-body-sm text-ash">{user.email}</p>
          </div>
          <button
            type="button" onClick={() => { logout(); toast('Signed out'); nav('/'); }}
            className="btn btn-sm shrink-0 gap-1.5 border border-stone bg-white text-graphite hover:bg-satin/60"
          >
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* ---------------- nav ----------------
            Mobile: a scrollable rail. Desktop: a sidebar. Same buttons, so
            there is only one set of state and one focus order. */}
        <nav aria-label="Account sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id} className="shrink-0 lg:w-full">
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={section === id ? 'page' : undefined}
                  className={`flex min-h-[44px] w-full items-center gap-2.5 whitespace-nowrap rounded-full px-4 text-body-sm font-medium transition-colors duration-fast lg:rounded-control lg:px-3.5 ${
                    section === id
                      ? 'bg-obsidian text-alabaster'
                      : 'bg-white/70 text-ash hover:text-obsidian lg:bg-transparent'
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ---------------- panels ---------------- */}
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="sr-only">{activeLabel}</h2>

          {section === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <button type="button" onClick={() => go('orders')} className="card-content text-left transition hover:border-obsidian/30">
                  <p className="text-label uppercase tracking-widest text-ash">Orders</p>
                  <p className="mt-2 font-display text-h3">{orders === null ? '—' : orders.length}</p>
                  <p className="mt-1 text-caption text-ash">View order history</p>
                </button>
                <button type="button" onClick={() => go('addresses')} className="card-content text-left transition hover:border-obsidian/30">
                  <p className="text-label uppercase tracking-widest text-ash">Addresses</p>
                  <p className="mt-2 font-display text-h3">{(user.addresses || []).length}</p>
                  <p className="mt-1 text-caption text-ash">Manage saved addresses</p>
                </button>
                <Link to="/wishlist" className="card-content block transition hover:border-obsidian/30">
                  <p className="text-label uppercase tracking-widest text-ash">Wishlist</p>
                  <p className="mt-2 font-display text-h3">♡</p>
                  <p className="mt-1 text-caption text-ash">Pieces you saved</p>
                </Link>
              </div>

              {defaultAddr && (
                <section className="card-content" aria-labelledby="ov-addr">
                  <div className="flex items-center justify-between gap-3">
                    <h3 id="ov-addr" className="text-label uppercase tracking-widest text-ash">Default delivery address</h3>
                    <button type="button" onClick={() => go('addresses')} className="min-h-[44px] text-caption font-semibold text-ash underline-offset-4 hover:text-obsidian hover:underline">Change</button>
                  </div>
                  <p className="mt-3 text-body-sm">{defaultAddr.address}</p>
                  <p className="text-caption text-ash">{[defaultAddr.city, defaultAddr.province, defaultAddr.postalCode].filter(Boolean).join(', ')}</p>
                </section>
              )}

              {orders !== null && orders.length > 0 && (
                <section className="card-content" aria-labelledby="ov-recent">
                  <div className="flex items-center justify-between gap-3">
                    <h3 id="ov-recent" className="text-label uppercase tracking-widest text-ash">Latest order</h3>
                    <button type="button" onClick={() => go('orders')} className="min-h-[44px] text-caption font-semibold text-ash underline-offset-4 hover:text-obsidian hover:underline">All orders</button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="font-mono text-body-sm">{orders[0].orderNumber}</p>
                    <span className="pill bg-satin text-obsidian">{orders[0].status}</span>
                    <p className="text-body-sm font-semibold tabular-nums">{pkr(orders[0].total)}</p>
                  </div>
                </section>
              )}
            </div>
          )}

          {section === 'orders' && (
            <section className="space-y-3" aria-labelledby="sec-orders">
              <h3 id="sec-orders" className="text-label uppercase tracking-widest text-ash">Order history</h3>
              {orders === null ? (
                <div role="status" aria-live="polite">
                  <span className="sr-only">Loading your orders…</span>
                  <div className="skeleton h-24 w-full rounded-card" />
                  <div className="skeleton mt-3 h-24 w-full rounded-card" />
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-card border border-dashed border-line py-14 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cream text-ash" aria-hidden="true">
                    <Package size={20} strokeWidth={1.6} />
                  </span>
                  <p className="mt-3 font-display text-h5">No orders yet</p>
                  <p className="mt-1 text-body-sm text-ash">When you place an order it will appear here.</p>
                  <Link to="/women" className="btn-primary mt-6">Start shopping</Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {orders.map((o) => (
                    <li key={o._id}>
                      {/* The phone is no longer passed in the URL — the track
                          page accepts an order number on its own for a signed-in
                          customer, and a phone number in a link leaks into
                          browser history and any shared screenshot. */}
                      <Link
                        to={`/track?orderNumber=${encodeURIComponent(o.orderNumber)}`}
                        className="card group flex flex-wrap items-center gap-3 p-4 transition hover:border-obsidian/30 sm:gap-4 sm:p-5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-body-sm">{o.orderNumber}</p>
                          <p className="mt-1 text-caption text-ash">
                            {fmtDate(o.createdAt)} · {o.items.length} item{o.items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className={`pill ${o.status === 'Delivered' ? 'bg-sage/25 text-sagedark' : 'bg-satin text-obsidian'}`}>{o.status}</span>
                        <p className="text-body-sm font-semibold tabular-nums">{pkr(o.total)}</p>
                        <ChevronRight size={16} className="shrink-0 text-ash transition group-hover:translate-x-0.5 group-hover:text-obsidian" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {section === 'profile' && <ProfilePanel cfg={cfg} user={user} onUpdated={onUpdated} />}
          {section === 'addresses' && <AddressPanel cfg={cfg} user={user} onUpdated={onUpdated} />}
          {section === 'security' && <SecurityPanel cfg={cfg} user={user} onUpdated={onUpdated} />}
        </div>
      </div>
    </div>
  );
}
