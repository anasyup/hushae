import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Heart, LayoutGrid, MapPin, Package, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import { accountConfig } from '../lib/accountConfig';
import AuthCard from './account/AuthCard';
import ProfilePanel from './account/ProfilePanel';
import AddressPanel from './account/AddressPanel';
import SecurityPanel from './account/SecurityPanel';
import SavedPanel from './account/SavedPanel';
import SessionsPanel from './account/SessionsPanel';
import NotificationsPanel from './account/NotificationsPanel';
import TrackOrderCard from '../components/TrackOrderCard';
import Seo from '../components/Seo';

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

/* `when` lets the merchant hide a whole section from
   Admin -> Settings -> Customer Accounts without a deploy. Sections with no
   `when` are always present. */
const ALL_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'saved', label: 'Saved', icon: Heart, when: (c) => c.showWishlist || c.showRecentlyViewed },
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'notifications', label: 'Notifications', icon: Bell, when: (c) => c.showNotifications },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

export default function Account() {
  const { auth, settings, patchUser } = useApp();

  const [policy, setPolicy] = useState(null);
  const cfg = useMemo(() => accountConfig(settings, policy), [settings, policy]);

  const SECTIONS = useMemo(() => ALL_SECTIONS.filter((s) => !s.when || s.when(cfg)), [cfg]);
  const [section, setSection] = useState('overview');
  const [orders, setOrders] = useState(null);
  const [user, setUser] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const headingRef = useRef(null);

  /* Loyalty standing, for the overview tile. `null` while in flight, and the
     tile renders a dash rather than a zero — showing "0 points" to someone who
     has 2,450 for half a second is worse than showing nothing. */
  const [loyalty, setLoyalty] = useState(null);
  const loyaltyOn = loyalty?.enabled === true;

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
    // Returns { enabled:false } when the merchant has the programme switched
    // off, which is why the tile keys on enabled rather than on the response.
    api('/loyalty/me', { token: auth.token })
      .then((d) => { if (alive) setLoyalty(d); })
      .catch(() => { if (alive) setLoyalty({ enabled: false }); });
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
      <div className="min-h-screen bg-[#FAF8F5] pt-[220px]"><Seo title="Account" description="Your HUSHAE account — orders, addresses, wishlist and profile." />
        <div className="container-page py-sect-y md:py-sect-y-lg">
        <div className="text-center">
          <h1 className="font-display text-h1">{cfg.signInTitle}</h1>
          <p className="mx-auto mt-3 max-w-md text-body text-ash">{cfg.signInSubtitle}</p>
        </div>
        <AuthCard cfg={cfg} policyLoaded={policy !== null} />
        </div>
      </div>
    );
  }

  /* ---------------- loading ---------------- */
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] pt-[220px]"><Seo title="Account" description="Your HUSHAE account — orders, addresses, wishlist and profile." />
        <div className="container-page py-sect-y">
        {loadErr ? (
          <div className="mx-auto max-w-md text-center">
            <h1 className="font-display text-h3">We could not load your account</h1>
            <p className="mt-3 text-body-sm text-ash">{loadErr}</p>
            <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-6">Try again</button>
          </div>
        ) : (
          /* The skeleton must reserve roughly what the real page occupies.
             A short skeleton let the footer paint high and then get pushed
             618px down when the account rendered — measured 0.1515 CLS at
             768px. These heights mirror the welcome card, the section rail
             (a row on mobile, a column from lg) and the overview panel. */
          <div role="status" aria-live="polite">
            <span className="sr-only">Loading your account…</span>
            <div className="skeleton h-[108px] w-full rounded-panel sm:h-[124px] lg:h-[134px]" />
            <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="skeleton h-[44px] w-full rounded-full lg:h-[228px] lg:rounded-card" />
              <div className="skeleton h-[330px] w-full rounded-card sm:h-[130px] lg:h-[256px]" />
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  const initials = (user.name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const activeLabel = SECTIONS.find((s) => s.id === section)?.label || '';

  return (
    <div className="min-h-screen bg-[#FAF8F5] pt-[220px]"><Seo title="Account" description="Your HUSHAE account — orders, addresses, wishlist and profile." />
      {/* Reference account-page wrapper — cream canvas, content starts below
          the fixed 96px header + announcement bar. */}
      <div className="mx-auto w-full max-w-[1280px] px-8 py-10">
      {/* ---------------- profile banner (reference register) ---------------- */}
      <section className="mb-8 flex items-center gap-[18px] border-b border-[#f0f0f0] pb-6">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-[52px] w-[52px] shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[#f3f4f6] text-[18px] font-bold text-[#111111]">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-bold tracking-[0.5px] text-[#111111]">{user.name}</h1>
          <p className="mt-0.5 truncate text-[13px] text-[#6b7280]">{user.email}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        {/* ---------------- nav ----------------
            Mobile: a scrollable rail. Desktop: a sidebar. Same buttons, so
            there is only one set of state and one focus order. */}
        {/* min-w-0 is what stops the scrollable rail from widening the page.
            A grid child defaults to min-width:auto, so the rail's full content
            width leaked into the layout and pushed the document 203px wider
            than the viewport on a phone — measured. */}
        <nav aria-label="Account sections" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id} className="shrink-0 lg:w-full">
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={section === id ? 'page' : undefined}
                  className={`flex min-h-[44px] w-full items-center gap-3 whitespace-nowrap rounded-full px-4 text-[14px] font-medium transition-colors lg:rounded-md lg:px-4 lg:py-3 ${
                    section === id
                      ? 'bg-[#111111] text-white'
                      : 'bg-white/70 text-[#4b5563] lg:bg-transparent'
                  }`}
                >
                  <Icon size={15} aria-hidden="true" strokeWidth={1.6} />
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
            <div className="grid gap-5 sm:grid-cols-3">
              {/* Reference dash-card: #FFFFFF, 1px #eee, radius 8, 24px pad,
                  title 11/700 tracked, value 28/600, desc 13px grey */}
              <button type="button" onClick={() => go('orders')} className="flex min-h-[140px] flex-col items-start rounded-lg border border-[#eeeeee] bg-[#FFFFFF] p-6 text-left">
                <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#6b7280]">Orders</span>
                <span className="my-3 text-[28px] font-semibold leading-none text-[#111111]">{orders === null ? '—' : orders.length}</span>
                <span className="mt-auto text-[13px] text-[#9ca3af]">View order history</span>
              </button>
              <button type="button" onClick={() => go('addresses')} className="flex min-h-[140px] flex-col items-start rounded-lg border border-[#eeeeee] bg-[#FFFFFF] p-6 text-left">
                <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#6b7280]">Addresses</span>
                <span className="my-3 text-[28px] font-semibold leading-none text-[#111111]">{(user.addresses || []).length}</span>
                <span className="mt-auto text-[13px] text-[#9ca3af]">Manage saved addresses</span>
              </button>
              {/* Rewards replaces the Wishlist tile when the programme is
                  running — the wishlist already has its own section in the
                  rail above, so the tile was a duplicate entry point. */}
              {loyaltyOn ? (
                <Link to="/rewards" className="flex min-h-[140px] flex-col items-start rounded-lg border border-[#eeeeee] bg-[#FFFFFF] p-6 text-left">
                  <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#6b7280]">Rewards</span>
                  <span className="my-3 text-[28px] font-semibold leading-none tabular-nums text-[#111111]">
                    {loyalty === null ? '—' : Number(loyalty.account?.points || 0).toLocaleString('en-PK')}
                  </span>
                  <span className="mt-auto text-[13px] text-[#9ca3af]">
                    {loyalty?.tier?.current?.name ? `${loyalty.tier.current.name} member` : 'Points and tiers'}
                  </span>
                </Link>
              ) : (
                <Link to="/wishlist" className="flex min-h-[140px] flex-col items-start rounded-lg border border-[#eeeeee] bg-[#FFFFFF] p-6 text-left">
                  <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#6b7280]">Wishlist</span>
                  <span className="my-3 text-[28px] font-semibold leading-none text-[#111111]">♡</span>
                  <span className="mt-auto text-[13px] text-[#9ca3af]">Pieces you saved</span>
                </Link>
              )}
            </div>
          )}

          {section === 'orders' && (
            <section className="space-y-3" aria-labelledby="sec-orders">
              <h3 id="sec-orders" className="text-label uppercase tracking-widest text-ash">Order history</h3>
              {/* Track an order — lives here (removed from the header) */}
              <TrackOrderCard />
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
                      {/* Goes to the private order page, not the public
                          tracker. The old link also carried the customer's
                          phone number in the query string. */}
                      <Link
                        to={`/account/orders/${encodeURIComponent(o.orderNumber)}`}
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

          {section === 'saved' && <SavedPanel cfg={cfg} />}
          {section === 'notifications' && <NotificationsPanel user={user} onUpdated={onUpdated} />}
          {section === 'profile' && <ProfilePanel cfg={cfg} user={user} onUpdated={onUpdated} />}
          {section === 'addresses' && <AddressPanel cfg={cfg} user={user} onUpdated={onUpdated} />}
          {section === 'security' && (
            <div className="space-y-6">
              <SecurityPanel cfg={cfg} user={user} onUpdated={onUpdated} />
              {cfg.showSessions && <SessionsPanel />}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
