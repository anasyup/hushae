import {Component, useEffect, lazy, Suspense} from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import Header from './components/Header';
import { useThemeDoc } from './theme-editor/useThemeDoc';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import CompareTray from './components/CompareTray';
import Toasts from './components/Toasts';

import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirm from './pages/OrderConfirm';
import Track from './pages/Track';
import FitFinder from './pages/FitFinder';
import Wishlist from './pages/Wishlist';
import SearchResults from './pages/Search';
import Rewards from './pages/Rewards';
import Compare from './pages/Compare';
import Account from './pages/Account';
import ResetPassword from './pages/account/ResetPassword';
import VerifyEmail from './pages/account/VerifyEmail';
import MyOrderDetail from './pages/account/OrderDetail';
import Sale from './pages/Sale';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Faq from './pages/Faq';
import Collection from './pages/Collection';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';

import AdminLogin from './admin/AdminLogin';



// The visual editor and its preview are heavy and admin-only — load on demand.
const ThemeEditorApp = lazy(() => import('./theme-editor/ThemeEditorApp'));
const PreviewApp = lazy(() => import('./theme-editor/ui/PreviewApp'));
const ThemedHome = lazy(() => import('./theme-editor/ThemedHome'));
const ThemedProduct = lazy(() => import('./theme-editor/ThemedProduct'));
const ThemedCollection = lazy(() => import('./theme-editor/ThemedCollection'));
const ThemedPage = lazy(() => import('./theme-editor/ThemedPage'));
const ThemedBlog = lazy(() => import('./theme-editor/ThemedBlog'));
const ThemedCart = lazy(() => import('./theme-editor/ThemedCart'));
import ThemeChrome from './theme-editor/ThemeChrome';
import './theme-editor/storefront.css';
/* CMS storefront page — EAGER, deliberately.
   MEASURED: as a lazy() route it is mounted by the /:cmsSlug catch-all, so EVERY
   unknown URL waited a chunk round trip before it could paint its 404. That
   showed as 0.6844 CLS against 0.0066 on the previous deployment. The component
   itself is 5.8 kB raw / 2.6 kB gzip; the heavy part is PageRenderer (56.9 kB),
   which stays lazy inside it and only loads for a page that actually has
   sections. So the cost is ~2.6 kB gzip on the shopper bundle and the benefit
   is that 404s and legal pages paint on frame one. */
import CmsPage from './pages/CmsPage';

/* ADMIN SCREENS — ALL lazy().
 *
 * MEASURED: 23 admin screens were EAGER imports, so the shopper index chunk
 * was 196 KB gzip and Lighthouse attributed 4,032 ms of LCP to *render delay*
 * — parsing and executing JS, not downloading images. Every visitor was
 * paying for the entire admin panel before the homepage could paint.
 * Gotcha 26 already required this; these predate it.
 *
 * AdminLogin stays eager: it is the gate, and a spinner on the login screen
 * is a worse trade than the two kilobytes it costs.
 */
const LiveView = lazy(() => import('./admin/LiveView'));
const Orders = lazy(() => import('./admin/Orders'));
const OrderDetail = lazy(() => import('./admin/OrderDetail'));
const OrderInvoice = lazy(() => import('./admin/OrderInvoice'));
const Products = lazy(() => import('./admin/Products'));
const ProductForm = lazy(() => import('./admin/ProductForm'));
const Categories = lazy(() => import('./admin/Categories'));
const Customers = lazy(() => import('./admin/Customers'));
const CustomerDetail = lazy(() => import('./admin/CustomerDetail'));
const CustomerGroups = lazy(() => import('./admin/CustomerGroups'));
const SettingsAdmin = lazy(() => import('./admin/Settings'));
const SettingsHub = lazy(() => import('./admin/SettingsHub'));
const Growth = lazy(() => import('./admin/Growth'));
const Discounts = lazy(() => import('./admin/Discounts'));
const Content = lazy(() => import('./admin/Content'));
const Markets = lazy(() => import('./admin/Markets'));
const Apps = lazy(() => import('./admin/Apps'));
const AbandonedCarts = lazy(() => import('./admin/AbandonedCarts'));
const AbandonedCartDetail = lazy(() => import('./admin/AbandonedCartDetail'));
const Backup = lazy(() => import('./admin/Backup'));
const Collections = lazy(() => import('./admin/Collections'));
const Reviews = lazy(() => import('./admin/Reviews'));
const AdminFaq = lazy(() => import('./admin/Faq'));
const ThemeEditor = lazy(() => import('./admin/ThemeEditor'));
const Reports = lazy(() => import('./admin/Reports'));
const Taxes = lazy(() => import('./admin/Taxes'));
const OnlineStore = lazy(() => import('./admin/OnlineStore'));
const SettingsStore = lazy(() => import('./admin/SettingsPages').then((m) => ({ default: m.SettingsStore })));
const SettingsPayments = lazy(() => import('./admin/SettingsPages').then((m) => ({ default: m.SettingsPayments })));
const SettingsShipping = lazy(() => import('./admin/SettingsPages').then((m) => ({ default: m.SettingsShipping })));
const SettingsBusinessAddress = lazy(() => import('./admin/SettingsAddress').then((m) => ({ default: m.SettingsBusinessAddress })));
const SettingsTimezone = lazy(() => import('./admin/SettingsAddress').then((m) => ({ default: m.SettingsTimezone })));
const SettingsCurrency = lazy(() => import('./admin/SettingsAddress').then((m) => ({ default: m.SettingsCurrency })));
const SettingsSecurity = lazy(() => import('./admin/SettingsSecurity'));
const SettingsLegal = lazy(() => import('./admin/SettingsPages').then((m) => ({ default: m.SettingsLegal })));
const SettingsEmail = lazy(() => import('./admin/SettingsEmail'));
// Admin-only screen: lazy so the bag settings form never ships to shoppers.
const SettingsCart = lazy(() => import('./admin/SettingsCart'));
const SettingsCheckout = lazy(() => import('./admin/SettingsCheckout'));
const SettingsAccounts = lazy(() => import('./admin/SettingsAccounts'));
const SettingsCX = lazy(() => import('./admin/SettingsCX'));
const SettingsReviews = lazy(() => import('./admin/SettingsReviews'));
const SettingsLoyalty = lazy(() => import('./admin/SettingsLoyalty'));
const SettingsSearch = lazy(() => import('./admin/SettingsSearch'));
const SettingsReserved = lazy(() => import('./admin/settings/SettingsReserved'));
const Inbox = lazy(() => import('./admin/Inbox'));
const CODRecon = lazy(() => import('./admin/CODRecon'));
const SettingsTeam = lazy(() => import('./admin/SettingsTeam'));
const SettingsPermissions = lazy(() => import('./admin/SettingsPermissions'));
const Transactions = lazy(() => import('./admin/Transactions'));
const CODHub = lazy(() => import('./admin/CODHub'));
const SystemStatus = lazy(() => import('./admin/SystemStatus'));
const SettingsMetafields = lazy(() => import('./admin/SettingsMetafields'));
const SetupChecklist = lazy(() => import('./admin/SetupChecklist'));
const SearchAnalytics = lazy(() => import('./admin/SearchAnalytics'));
/* Marketing screens: lazy so none of this reaches a shopper's bundle. */
const Promotions = lazy(() => import('./admin/Promotions'));
const PromotionEdit = lazy(() => import('./admin/PromotionEdit'));
const MarketingSettings = lazy(() => import('./admin/MarketingSettings'));
const MarketingAnalytics = lazy(() => import('./admin/MarketingAnalytics'));
const EmailCampaigns = lazy(() => import('./admin/EmailCampaigns'));
const BannerList = lazy(() => import('./admin/BannerList'));
const BannerEdit = lazy(() => import('./admin/BannerEdit'));
const BannerSlots = lazy(() => import('./admin/BannerSlots'));
const Marketing = lazy(() => import('./admin/Marketing'));
/* CMS screens: lazy (gotcha 26). The page builder pulls the section registry
   and must never reach a shopper's bundle. */
const Cms = lazy(() => import('./admin/Cms'));
const CmsEdit = lazy(() => import('./admin/CmsEdit'));
const CmsRedirects = lazy(() => import('./admin/CmsRedirects'));
const AdminBlog = lazy(() => import('./admin/Blog'));
const AdminBlogEdit = lazy(() => import('./admin/BlogEdit'));
const Navigation = lazy(() => import('./admin/Navigation'));
const AdminLoyalty = lazy(() => import('./admin/Loyalty'));
const AdminQuestions = lazy(() => import('./admin/Questions'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const Overview = lazy(() => import('./admin/Overview'));
const Analytics = lazy(() => import('./admin/Analytics'));
const Insights = lazy(() => import('./admin/Insights'));
const Finance = lazy(() => import('./admin/Finance'));
const Payments = lazy(() => import('./admin/Payments'));
const OrdersDesk = lazy(() => import('./admin/orders/OrdersDesk'));
const DraftOrder = lazy(() => import('./admin/orders/DraftOrder'));
const OrderPrintDoc = lazy(() => import('./admin/orders/OrderPrintDoc'));
const DraftOrders = lazy(() => import('./admin/DraftOrders'));
const VerificationQueue = lazy(() => import('./admin/VerificationQueue'));
const CommerceOps = lazy(() => import('./admin/CommerceOps'));
/* Storefront suspense placeholder. EditorFallback is a full-height grey admin
   screen and would flash over the shop chrome. This reserves a reading column
   instead, which is what keeps CLS at zero on a CMS route. */
/* Deliberately EMPTY. Sprint 2L P3 measured three different placeholder
   heights and every one of them caused a layout shift, because the height of
   the page you are about to render is not knowable. Painting nothing cannot
   shift anything. */
const RouteFallback = () => null;

const EditorFallback = () => (
  <div className="grid h-screen place-items-center text-sm text-neutral-400">Loading editor…</div>
);

import WhatsAppFloat from './components/WhatsAppFloat';
import StoreLock from './components/StoreLock';
import CookieConsent from './components/CookieConsent';
import PromoPopup from './components/PromoPopup';
import MobileNav from './components/MobileNav';
import { track } from './lib/track';
import { applyAdminTheme } from './lib/adminTheme';
import AnalyticsInjector from './components/Analytics';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname, search]);
  return null;
}

/* Re-apply the admin dark/light class whenever the route changes — the class
   is added on admin pages and removed on the storefront, so navigating
   admin ↔ storefront never leaves the wrong palette applied. */
function AdminThemeSync() {
  const { pathname } = useLocation();
  useEffect(() => { applyAdminTheme(); }, [pathname]);
  return null;
}

// Anonymous storefront visit tracking (skips admin pages)
function Tracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    track(pathname === '/checkout' ? 'checkout' : 'pageview', pathname);
  }, [pathname]);
  return null;
}

// Global shield — any per-page JS error no longer blanks the entire site
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false, err: null }; }
  static getDerivedStateFromError(err) { return { crashed: true, err }; }
  componentDidCatch(e, info) { console.error('UI crash:', e, info); }
  render() {
    if (this.state.crashed) {
      return (
        <div className="grid min-h-screen place-items-center bg-alabaster px-6" role="alert">
          <div className="panel w-full max-w-md p-8 text-center">
            <p className="font-display text-h4 tracking-widest2">HUSHAE</p>
            <p className="mt-3 text-body-sm leading-relaxed">Something went wrong on this page. Please reload — it should recover.</p>
            {this.state.err && (
              <pre className="mt-4 max-h-40 overflow-auto rounded border border-red-200 bg-red-50 p-3 text-left text-[11px] text-red-800" style={{ whiteSpace: 'pre-wrap' }}>
                {String(this.state.err.message || this.state.err)}
              </pre>
            )}
            <button onClick={() => window.location.reload()} className="btn-primary mt-5 w-full">Reload page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Legacy admin paths -> their real home. Keeps old bookmarks and any
   stale link working; anything unmapped falls through to NotFound. */
const ADMIN_REDIRECTS = {
  '/admin/campaigns': '/admin/email-campaigns',
  '/admin/automations': '/admin/marketing',
  '/admin/automation-rules': '/admin/marketing',
  '/admin/email-marketing': '/admin/email-campaigns',
  '/admin/sms-marketing': '/admin/marketing',
  '/admin/social-marketing': '/admin/marketing',
  '/admin/segments': '/admin/customers/groups',
  '/admin/abandoned-cart': '/admin/abandoned-carts',
  '/admin/loyalty-campaigns': '/admin/loyalty',
  '/admin/discounts/auto': '/admin/discounts',
  '/admin/discounts/percentage': '/admin/discounts',
  '/admin/discounts/fixed': '/admin/discounts',
  '/admin/discounts/shipping': '/admin/discounts',
  '/admin/discounts/bundles': '/admin/discounts',
  '/admin/discounts/customers': '/admin/discounts',
  '/admin/discounts/products': '/admin/discounts',
  '/admin/discounts/collections': '/admin/discounts',
  '/admin/gift-cards': '/admin/settings/loyalty',
  '/admin/analytics/sales': '/admin/analytics',
  '/admin/analytics/orders': '/admin/analytics',
  '/admin/analytics/products': '/admin/analytics',
  '/admin/analytics/customers': '/admin/analytics',
  '/admin/analytics/inventory': '/admin/analytics',
  '/admin/analytics/marketing': '/admin/analytics',
  '/admin/analytics/conversion': '/admin/analytics',
  '/admin/analytics/storefront': '/admin/analytics',
  '/admin/analytics/finance': '/admin/analytics',
  '/admin/analytics/custom': '/admin/analytics',
  '/admin/analytics/export': '/admin/analytics',
  '/admin/analytics/live': '/admin/live',
  '/admin/inventory': '/admin/ops/inventory',
  '/admin/inventory/low': '/admin/ops/inventory',
  '/admin/inventory/out': '/admin/ops/inventory',
  '/admin/inventory/reserved': '/admin/ops/inventory',
  '/admin/inventory/incoming': '/admin/ops/inventory',
  '/admin/inventory/history': '/admin/ops/inventory',
  '/admin/warehouses': '/admin/ops/inventory',
  '/admin/locations': '/admin/ops/inventory',
  '/admin/transfers': '/admin/ops/inventory',
  '/admin/adjustments': '/admin/ops/inventory',
  '/admin/fulfillment': '/admin/ops',
  '/admin/shipping/methods': '/admin/settings/shipping',
  '/admin/shipping/zones': '/admin/settings/shipping',
  '/admin/shipping/rates': '/admin/settings/shipping',
  '/admin/shipping/providers': '/admin/settings/shipping',
  '/admin/shipping/labels': '/admin/settings/shipping',
  '/admin/shipping/tracking': '/admin/settings/shipping',
  '/admin/shipping/local': '/admin/settings/shipping',
  '/admin/shipping/pickup': '/admin/settings/shipping',
  '/admin/shipping/settings': '/admin/settings/shipping',
  '/admin/payments/methods': '/admin/settings/payments',
  '/admin/payments/providers': '/admin/settings/payments',
  '/admin/payments/transactions': '/admin/finance/transactions',
  '/admin/payments/payouts': '/admin/finance',
  '/admin/payments/invoices': '/admin/finance',
  '/admin/payments/refunds': '/admin/finance',
  '/admin/payments/failures': '/admin/finance',
  '/admin/payments/reports': '/admin/finance',
  '/admin/taxes/regions': '/admin/settings/taxes',
  '/admin/taxes/rates': '/admin/settings/taxes',
  '/admin/taxes/classes': '/admin/settings/taxes',
  '/admin/taxes/exemptions': '/admin/settings/taxes',
  '/admin/taxes/duties': '/admin/settings/taxes',
  '/admin/taxes/settings': '/admin/settings/taxes',
  '/admin/apps/marketplace': '/admin/apps',
  '/admin/integrations/payments': '/admin/apps',
  '/admin/integrations/shipping': '/admin/apps',
  '/admin/integrations/marketing': '/admin/apps',
  '/admin/integrations/analytics': '/admin/apps',
  '/admin/integrations/marketplaces': '/admin/apps',
  '/admin/integrations/accounting': '/admin/apps',
  '/admin/integrations/import': '/admin/apps',
  '/admin/integrations/product-sync': '/admin/apps',
  '/admin/integrations/order-sync': '/admin/apps',
  '/admin/api-keys': '/admin/apps',
  '/admin/webhooks': '/admin/apps',
  '/admin/sync-history': '/admin/apps',
  '/admin/integration-logs': '/admin/apps',
  '/admin/channels/online': '/admin/store',
  '/admin/channels/online/storefront': '/admin/store',
  '/admin/channels/online/publishing': '/admin/store',
  '/admin/channels/online/collections': '/admin/store',
  '/admin/channels/online/settings': '/admin/store',
  '/admin/channels/mobile': '/admin/store',
  '/admin/channels/social': '/admin/store',
  '/admin/channels/marketplaces': '/admin/store',
  '/admin/channels/wholesale': '/admin/store',
  '/admin/channels/pos': '/admin/store',
};

function AdminLegacyRedirect() {
  const loc = useLocation();
  const to = ADMIN_REDIRECTS[loc.pathname];
  if (to) return <Navigate to={to + loc.search} replace />;
  return <NotFound />;
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const { themed, theme: themeDocSettings } = useThemeDoc();
  // A published theme document renders its own header and footer on the home
  // page, so the legacy chrome is suppressed there to avoid duplicates.
  const themedHome = themed && pathname === '/';

  // Theme-editor preview iframe renders bare — no storefront chrome, no
  // StoreLock, no analytics. It receives its document over postMessage.
  if (pathname === '/__theme-preview') {
    return <Suspense fallback={<EditorFallback />}><PreviewApp /></Suspense>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <AdminThemeSync />
      <Tracker />
      {!isAdmin && themed && <ThemeChrome theme={themeDocSettings} />}
      {!isAdmin && (
        <a href="#main-content" className="skip-link">Skip to content</a>
      )}
      {!isAdmin && !themedHome && <Header />}
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
        <ErrorBoundary key={pathname}>
        <StoreLock>
        {/* ONE Suspense boundary around the whole route table.
            Every admin screen is lazy() now, and a lazy component with no
            boundary above it throws "A component suspended while responding to
            synchronous input". Wrapping here rather than repeating <Suspense>
            on 22 routes keeps the table readable and gives one consistent
            fallback. The storefront routes that already carry their own
            boundary keep it — an inner boundary wins, so the home page still
            reserves its own 100svh hold space instead of showing this one. */}
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop preset={{ key: 'all' }} />} />
          <Route path="/women" element={<Shop preset={{ key: 'women', gender: 'women' }} />} />
          <Route path="/men" element={<Shop preset={{ key: 'men', gender: 'men' }} />} />
          <Route path="/new" element={<Shop preset={{ key: 'new', sort: 'newest' }} />} />
          <Route path="/best" element={<Shop preset={{ key: 'best', bestSeller: true }} />} />
          <Route path="/sale" element={<Shop preset={{ key: 'sale' }} />} />
          <Route path="/category/:slug" element={<ShopWithCategory />} />
          <Route path="/product/:slug" element={<ThemedProduct fallback={Product} />} />
          <Route path="/cart" element={<ThemedCart fallback={Cart} />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:orderNumber" element={<OrderConfirm />} />
          <Route path="/track" element={<Track />} />
          <Route path="/fit-finder" element={<FitFinder />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/account" element={<Account />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/account/orders/:key" element={<MyOrderDetail />} />
          {/* FAQ — a CMS page at /faq wins if the merchant makes one; otherwise
              the existing settings-driven page with its FAQPage schema stays.
              Same reversible pattern as the legal routes. */}
          {/* FAQ + LEGAL — direct static routes (no CMS fetch, no 404 console
              noise). Content stays the settings-driven FAQ and hardcoded legal
              copy; a merchant CMS page would require flipping these back. */}
          <Route path="/faq" element={<Faq />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/returns" element={<Legal kind="returns" />} />
          <Route path="/shipping-policy" element={<Legal kind="shipping" />} />
          <Route path="/collection/:slug" element={<ThemedCollection fallback={Collection} />} />
          {/* BLOG — journal / fit guides. /blog lists, /blog/:slug reads. */}
          <Route path="/blog" element={<ThemedBlog fallback={Blog} />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          {/* Journal — the editorial voice (CDLP-style nav item) */}
          <Route path="/journal" element={<Blog />} />
          <Route path="/journal/:slug" element={<BlogPost />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/inbox" element={<Suspense fallback={<EditorFallback />}><Inbox /></Suspense>} />
          <Route path="/admin/cod" element={<Suspense fallback={<EditorFallback />}><CODHub /></Suspense>} />
          <Route path="/admin/cod-recon" element={<Suspense fallback={<EditorFallback />}><CODRecon /></Suspense>} />
          <Route path="/admin/inbox/:tab" element={<Suspense fallback={<EditorFallback />}><Inbox /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<EditorFallback />}><Overview /></Suspense>} />
          <Route path="/admin/dashboard" element={<Suspense fallback={<EditorFallback />}><Dashboard /></Suspense>} />
          <Route path="/admin/setup" element={<Suspense fallback={<EditorFallback />}><SetupChecklist /></Suspense>} />
          <Route path="/admin/live" element={<LiveView />} />
          <Route path="/admin/orders" element={<Suspense fallback={<EditorFallback />}><OrdersDesk /></Suspense>} />
          <Route path="/admin/verification-queue" element={<Suspense fallback={<EditorFallback />}><VerificationQueue /></Suspense>} />
          <Route path="/admin/ops" element={<Suspense fallback={<EditorFallback />}><CommerceOps /></Suspense>} />
          <Route path="/admin/ops/inventory" element={<Suspense fallback={<EditorFallback />}><CommerceOps start="stock" /></Suspense>} />
          <Route path="/admin/ops/returns" element={<Suspense fallback={<EditorFallback />}><CommerceOps start="returns" /></Suspense>} />
          <Route path="/admin/ops/comms" element={<Suspense fallback={<EditorFallback />}><CommerceOps start="comms" /></Suspense>} />
          <Route path="/admin/ops/risk" element={<Suspense fallback={<EditorFallback />}><CommerceOps start="risk" /></Suspense>} />
          <Route path="/admin/orders/new" element={<Suspense fallback={<EditorFallback />}><DraftOrder /></Suspense>} />
          <Route path="/admin/orders-legacy" element={<Orders />} />
          {/* Legacy order-list paths now live inside the desk's tabs. */}
          <Route path="/admin/orders/pending" element={<Navigate to="/admin/orders?group=new" replace />} />
          <Route path="/admin/orders/processing" element={<Navigate to="/admin/orders?group=processing" replace />} />
          <Route path="/admin/orders/fulfillment" element={<Navigate to="/admin/orders?group=to-ship" replace />} />
          <Route path="/admin/orders/shipped" element={<Navigate to="/admin/orders?group=shipped" replace />} />
          <Route path="/admin/orders/delivered" element={<Navigate to="/admin/orders?group=delivered" replace />} />
          <Route path="/admin/orders/cancelled" element={<Navigate to="/admin/orders?group=issues" replace />} />
          <Route path="/admin/orders/returns" element={<Navigate to="/admin/orders?group=issues" replace />} />
          <Route path="/admin/orders/refunds" element={<Navigate to="/admin/orders?group=issues" replace />} />
          <Route path="/admin/orders/issues" element={<Navigate to="/admin/verification-queue" replace />} />
          <Route path="/admin/orders/draft" element={<Suspense fallback={<EditorFallback />}><DraftOrders /></Suspense>} />
          <Route path="/admin/orders/:id" element={<OrderDetail />} />
          <Route path="/admin/orders/:id/invoice" element={<OrderInvoice />} />
          <Route path="/admin/orders/:id/print/:doc" element={<Suspense fallback={<EditorFallback />}><OrderPrintDoc /></Suspense>} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/products/:id" element={<ProductForm />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/customers" element={<Customers />} />
          <Route path="/admin/customers/groups" element={<Suspense fallback={<EditorFallback />}><CustomerGroups /></Suspense>} />
          <Route path="/admin/customers/:id" element={<CustomerDetail />} />
          <Route path="/admin/settings" element={<SettingsHub />} />
          <Route path="/admin/settings/store" element={<SettingsStore />} />
          <Route path="/admin/settings/payments" element={<SettingsPayments />} />
          <Route path="/admin/settings/shipping" element={<SettingsShipping />} />
          <Route path="/admin/settings/email" element={<Suspense fallback={<EditorFallback />}><SettingsEmail /></Suspense>} />
          <Route path="/admin/settings/cart" element={<Suspense fallback={<EditorFallback />}><SettingsCart /></Suspense>} />
          <Route path="/admin/settings/checkout" element={<Suspense fallback={<EditorFallback />}><SettingsCheckout /></Suspense>} />
          <Route path="/admin/settings/accounts" element={<Suspense fallback={<EditorFallback />}><SettingsAccounts /></Suspense>} />
          <Route path="/admin/settings/experience" element={<Suspense fallback={<EditorFallback />}><SettingsCX /></Suspense>} />
          <Route path="/admin/settings/reviews" element={<Suspense fallback={<EditorFallback />}><SettingsReviews /></Suspense>} />
          <Route path="/admin/settings/loyalty" element={<Suspense fallback={<EditorFallback />}><SettingsLoyalty /></Suspense>} />
          <Route path="/admin/loyalty" element={<Suspense fallback={<EditorFallback />}><AdminLoyalty /></Suspense>} />
          <Route path="/admin/settings/search" element={<Suspense fallback={<EditorFallback />}><SettingsSearch /></Suspense>} />
          <Route path="/admin/search-analytics" element={<Suspense fallback={<EditorFallback />}><SearchAnalytics /></Suspense>} />
          <Route path="/admin/promotions" element={<Suspense fallback={<EditorFallback />}><Promotions /></Suspense>} />
          {/* /new must be declared BEFORE /:id or "new" is read as an id. */}
          <Route path="/admin/promotions/new" element={<Suspense fallback={<EditorFallback />}><PromotionEdit /></Suspense>} />
          <Route path="/admin/promotions/:id" element={<Suspense fallback={<EditorFallback />}><PromotionEdit /></Suspense>} />
          {/* Bundles and flash sales are the same list, pre-filtered by type —
              a separate screen for each would be three copies of one table. */}
          <Route path="/admin/bundles" element={<Suspense fallback={<EditorFallback />}><Promotions /></Suspense>} />
          <Route path="/admin/flash-sales" element={<Suspense fallback={<EditorFallback />}><Promotions /></Suspense>} />
          <Route path="/admin/marketing" element={<Suspense fallback={<EditorFallback />}><Marketing /></Suspense>} />
          <Route path="/admin/marketing/settings" element={<Suspense fallback={<EditorFallback />}><MarketingSettings /></Suspense>} />
          <Route path="/admin/marketing/analytics" element={<Suspense fallback={<EditorFallback />}><MarketingAnalytics /></Suspense>} />
          <Route path="/admin/email-campaigns" element={<Suspense fallback={<EditorFallback />}><EmailCampaigns /></Suspense>} />
          <Route path="/admin/banners" element={<Suspense fallback={<EditorFallback />}><BannerList /></Suspense>} />
          <Route path="/admin/banners/slots" element={<Suspense fallback={<EditorFallback />}><BannerSlots /></Suspense>} />
          <Route path="/admin/banners/new" element={<Suspense fallback={<EditorFallback />}><BannerEdit /></Suspense>} />
          <Route path="/admin/banners/:id" element={<Suspense fallback={<EditorFallback />}><BannerEdit /></Suspense>} />
          <Route path="/admin/cms" element={<Suspense fallback={<EditorFallback />}><Cms /></Suspense>} />
          {/* /new and /redirects must precede /:id or they are read as ids. */}
          <Route path="/admin/cms/new" element={<Suspense fallback={<EditorFallback />}><CmsEdit /></Suspense>} />
          <Route path="/admin/cms/redirects" element={<Suspense fallback={<EditorFallback />}><CmsRedirects /></Suspense>} />
          <Route path="/admin/cms/:id" element={<Suspense fallback={<EditorFallback />}><CmsEdit /></Suspense>} />
          {/* BLOG — article management. /new must precede /:id. */}
          <Route path="/admin/blog" element={<Suspense fallback={<EditorFallback />}><AdminBlog /></Suspense>} />
          <Route path="/admin/navigation" element={<Suspense fallback={<EditorFallback />}><Navigation /></Suspense>} />
          <Route path="/admin/blog/new" element={<Suspense fallback={<EditorFallback />}><AdminBlogEdit /></Suspense>} />
          <Route path="/admin/blog/:id" element={<Suspense fallback={<EditorFallback />}><AdminBlogEdit /></Suspense>} />
          <Route path="/admin/settings/security" element={<SettingsSecurity />} />
          <Route path="/admin/settings/taxes" element={<Suspense fallback={<EditorFallback />}><Taxes /></Suspense>} />
          <Route path="/admin/settings/legal" element={<SettingsLegal />} />
          <Route path="/admin/settings/advanced" element={<SettingsAdmin />} />
          <Route path="/admin/settings/team" element={<Suspense fallback={<EditorFallback />}><SettingsTeam /></Suspense>} />
          <Route path="/admin/settings/roles" element={<Suspense fallback={<EditorFallback />}><SettingsTeam /></Suspense>} />
          <Route path="/admin/settings/system-status" element={<Suspense fallback={<EditorFallback />}><SystemStatus /></Suspense>} />
          <Route path="/admin/settings/error-logs" element={<Suspense fallback={<EditorFallback />}><SystemStatus /></Suspense>} />
          <Route path="/admin/settings/metafields" element={<Suspense fallback={<EditorFallback />}><SettingsMetafields /></Suspense>} />
          <Route path="/admin/settings/metaobjects" element={<Suspense fallback={<EditorFallback />}><SettingsMetafields /></Suspense>} />
          <Route path="/admin/settings/custom-fields" element={<Suspense fallback={<EditorFallback />}><SettingsMetafields /></Suspense>} />
          {/* ── SETTINGS CONSOLE rail destinations ─────────────────────────
              Every item in the settings rail resolves to a route. Where a
              real editor already exists it is reused (one component, several
              entry points); the rest render the honest reserved pane. */}
          <Route path="/admin/settings/customer-login" element={<Suspense fallback={<EditorFallback />}><SettingsAccounts /></Suspense>} />
          <Route path="/admin/settings/guest-checkout" element={<Suspense fallback={<EditorFallback />}><SettingsAccounts /></Suspense>} />
          <Route path="/admin/settings/account-fields" element={<Suspense fallback={<EditorFallback />}><SettingsAccounts /></Suspense>} />
          <Route path="/admin/settings/customer-privacy" element={<Suspense fallback={<EditorFallback />}><SettingsAccounts /></Suspense>} />
          <Route path="/admin/settings/store-credit" element={<Suspense fallback={<EditorFallback />}><SettingsLoyalty /></Suspense>} />
          <Route path="/admin/settings/markets" element={<Markets />} />
          <Route path="/admin/settings/security/2fa" element={<SettingsSecurity />} />
          <Route path="/admin/settings/security/sessions" element={<SettingsSecurity />} />
          <Route path="/admin/settings/security/activity" element={<SettingsSecurity />} />
          <Route path="/admin/settings/security/alerts" element={<SettingsSecurity />} />
          {/* team/roles routes (dedup, real SettingsTeam wired above); access + permissions → Roles & Access pane */}
          <Route path="/admin/settings/permissions" element={<Suspense fallback={<EditorFallback />}><SettingsPermissions /></Suspense>} />
          <Route path="/admin/settings/store-access" element={<Suspense fallback={<EditorFallback />}><SettingsPermissions /></Suspense>} />
          <Route path="/admin/settings/product-access" element={<Suspense fallback={<EditorFallback />}><SettingsPermissions /></Suspense>} />
          <Route path="/admin/settings/order-access" element={<Suspense fallback={<EditorFallback />}><SettingsPermissions /></Suspense>} />
          <Route path="/admin/settings/customer-access" element={<Suspense fallback={<EditorFallback />}><SettingsPermissions /></Suspense>} />
          <Route path="/admin/settings/finance-access" element={<Suspense fallback={<EditorFallback />}><SettingsPermissions /></Suspense>} />
          <Route path="/admin/settings/audit-logs" element={<SettingsSecurity />} />
          <Route path="/admin/settings/backup" element={<Backup />} />
          <Route path="/admin/settings/export" element={<Backup />} />
          <Route path="/admin/settings/import" element={<Backup />} />
          <Route path="/admin/settings/policies" element={<SettingsLegal />} />
          <Route path="/admin/settings/privacy" element={<SettingsLegal />} />
          <Route path="/admin/settings/address" element={<SettingsBusinessAddress />} />
          <Route path="/admin/settings/timezone" element={<SettingsTimezone />} />
          <Route path="/admin/settings/currency" element={<SettingsCurrency />} />
          <Route path="/admin/settings/units" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/domain" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/languages" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/notifications" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/metafields" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/metaobjects" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/custom-fields" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/billing" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/billing/upgrade" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/billing/usage" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/billing/invoices" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/billing/payment-method" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/billing/seats" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/billing/stores" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/billing/subscription" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/delete" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/migration" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/retention" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/system-status" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/error-logs" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/maintenance" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/api" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/webhooks" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/developer" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/flags" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/cache" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/settings/config" element={<Suspense fallback={<EditorFallback />}><SettingsReserved /></Suspense>} />
          <Route path="/admin/store" element={<OnlineStore />} />
          <Route path="/admin/growth" element={<Growth />} />
          <Route path="/admin/reports" element={<Suspense fallback={<EditorFallback />}><Reports /></Suspense>} />
          <Route path="/admin/discounts" element={<Discounts />} />
          <Route path="/admin/content" element={<Content />} />
          <Route path="/admin/markets" element={<Markets />} />
          <Route path="/admin/analytics" element={<Suspense fallback={<EditorFallback />}><Analytics /></Suspense>} />
          <Route path="/admin/insights" element={<Suspense fallback={<EditorFallback />}><Insights /></Suspense>} />
          <Route path="/admin/finance" element={<Suspense fallback={<EditorFallback />}><Finance /></Suspense>} />
          <Route path="/admin/finance/transactions" element={<Suspense fallback={<EditorFallback />}><Transactions /></Suspense>} />
          <Route path="/admin/abandoned-carts" element={<AbandonedCarts />} />
          <Route path="/admin/abandoned-carts/:id" element={<Suspense fallback={<EditorFallback />}><AbandonedCartDetail /></Suspense>} />
          <Route path="/admin/reviews" element={<Reviews />} />
          <Route path="/admin/questions" element={<Suspense fallback={<EditorFallback />}><AdminQuestions /></Suspense>} />


          <Route path="/admin/faq" element={<AdminFaq />} />

          {/* Theme Editor (default) = LIVE storefront settings editor — edits
              store settings with an instant live preview; never touches the
              theme document, so it can never override the React home.
              Theme Sections = the visual section/page builder (explicit
              Publish only — autosave keeps a draft, never auto-publishes). */}
          <Route path="/admin/theme" element={<Suspense fallback={<EditorFallback />}><ThemeEditor /></Suspense>} />
          <Route path="/admin/theme-sections" element={<Suspense fallback={<EditorFallback />}><ThemeEditorApp /></Suspense>} />
          <Route path="/admin/theme-legacy" element={<ThemeEditor />} />

          <Route path="/admin/backup" element={<Backup />} />
          <Route path="/admin/export" element={<Backup />} />
          <Route path="/admin/payments" element={<Suspense fallback={<EditorFallback />}><Payments /></Suspense>} />
          <Route path="/admin/collections" element={<Collections />} />
          <Route path="/admin/apps" element={<Apps />} />

          {/* ---- CMS CATCH-ALL ----------------------------------------
              Declared LAST, after every real route. React Router v6 already
              ranks a static segment above a dynamic one, so /cart beats
              /:cmsSlug regardless of order — but the position makes the intent
              obvious, and the server refuses the 24 reserved slugs anyway, so
              a merchant cannot create a page that shadows the shop.
              A single segment only: /:cmsSlug does not match /a/b, which keeps
              product and category URLs out of reach.                        */}
          <Route path="/admin/*" element={<AdminLegacyRedirect />} />
          <Route path="/:cmsSlug" element={<ThemedPage fallback={CmsPage} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </StoreLock>
        </ErrorBoundary>
      </main>
      {!isAdmin && !themedHome && <Footer />}
      {!isAdmin && <CartDrawer />}
      {!isAdmin && <CompareTray />}
      {!isAdmin && <WhatsAppFloat />}
      {!isAdmin && <CookieConsent />}
      {!isAdmin && <PromoPopup />}
      {!isAdmin && <MobileNav />}
      <AnalyticsInjector />
      <Toasts />
    </div>
  );
}

function ShopWithCategory() {
  const { slug } = useParams();
  return <Shop key={slug} preset={{ category: slug }} />;
}
