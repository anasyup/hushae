import {Component, useEffect, lazy, Suspense} from 'react';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
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
const CustomerGroups = lazy(() => import('./admin/CustomerGroups'));
const SettingsAdmin = lazy(() => import('./admin/Settings'));
const SettingsHub = lazy(() => import('./admin/SettingsHub'));
const Growth = lazy(() => import('./admin/Growth'));
const Discounts = lazy(() => import('./admin/Discounts'));
const Content = lazy(() => import('./admin/Content'));
const Markets = lazy(() => import('./admin/Markets'));
const Apps = lazy(() => import('./admin/Apps'));
const AbandonedCarts = lazy(() => import('./admin/AbandonedCarts'));
const Backup = lazy(() => import('./admin/Backup'));
const Collections = lazy(() => import('./admin/Collections'));
const Reviews = lazy(() => import('./admin/Reviews'));
const AdminFaq = lazy(() => import('./admin/Faq'));
const ThemeEditor = lazy(() => import('./admin/ThemeEditor'));
const OnlineStore = lazy(() => import('./admin/OnlineStore'));
const SettingsStore = lazy(() => import('./admin/SettingsPages').then((m) => ({ default: m.SettingsStore })));
const SettingsPayments = lazy(() => import('./admin/SettingsPages').then((m) => ({ default: m.SettingsPayments })));
const SettingsShipping = lazy(() => import('./admin/SettingsPages').then((m) => ({ default: m.SettingsShipping })));
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
const Analytics = lazy(() => import('./admin/Analytics'));
const Insights = lazy(() => import('./admin/Insights'));
const Finance = lazy(() => import('./admin/Finance'));
const Payments = lazy(() => import('./admin/Payments'));
const OrdersDesk = lazy(() => import('./admin/orders/OrdersDesk'));
const DraftOrder = lazy(() => import('./admin/orders/DraftOrder'));
const OrderPrintDoc = lazy(() => import('./admin/orders/OrderPrintDoc'));
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
  constructor(props) { super(props); this.state = { crashed: false }; }
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(e, info) { console.error('UI crash:', e, info); }
  render() {
    if (this.state.crashed) {
      return (
        <div className="grid min-h-screen place-items-center bg-alabaster px-6" role="alert">
          <div className="panel w-full max-w-sm p-8 text-center">
            <p className="font-display text-h4 tracking-widest2">HUSHAE</p>
            <p className="mt-3 text-body-sm leading-relaxed">Something went wrong on this page. Please reload — it should recover. If the problem continues, contact our support team.</p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-5 w-full">Reload page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const { themed } = useThemeDoc();
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
          <Route path="/" element={<Suspense fallback={<div aria-hidden="true" className="min-h-[100svh] w-full bg-obsidian" />}><ThemedHome fallback={Home} /></Suspense>} />
          <Route path="/shop" element={<Shop preset={{ key: 'all' }} />} />
          <Route path="/women" element={<Shop preset={{ key: 'women', gender: 'women' }} />} />
          <Route path="/men" element={<Shop preset={{ key: 'men', gender: 'men' }} />} />
          <Route path="/new" element={<Shop preset={{ key: 'new', sort: 'newest' }} />} />
          <Route path="/best" element={<Shop preset={{ key: 'best', bestSeller: true }} />} />
          <Route path="/sale" element={<Sale />} />
          <Route path="/category/:slug" element={<ShopWithCategory />} />
          <Route path="/product/:slug" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
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
          <Route path="/faq" element={<CmsPage slug="faq" fallback={Faq} />} />
          {/* LEGAL PAGES — address unchanged, content from the CMS.
              `fallback` renders the original hardcoded copy until the merchant
              creates the page, so the migration is reversible and /privacy is
              never blank. Deleting Legal.jsx before real pages exist would be
              the breaking change this avoids. */}
          <Route path="/privacy" element={<CmsPage slug="privacy" fallback={() => <Legal kind="privacy" />} />} />
          <Route path="/terms" element={<CmsPage slug="terms" fallback={() => <Legal kind="terms" />} />} />
          <Route path="/returns" element={<CmsPage slug="returns" fallback={() => <Legal kind="returns" />} />} />
          <Route path="/shipping-policy" element={<CmsPage slug="shipping-policy" fallback={() => <Legal kind="shipping" />} />} />
          <Route path="/collection/:slug" element={<Collection />} />
          {/* BLOG — journal / fit guides. /blog lists, /blog/:slug reads. */}
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          {/* Journal — the editorial voice (CDLP-style nav item) */}
          <Route path="/journal" element={<Blog />} />
          <Route path="/journal/:slug" element={<BlogPost />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Suspense fallback={<EditorFallback />}><Dashboard /></Suspense>} />
          <Route path="/admin/live" element={<LiveView />} />
          <Route path="/admin/orders" element={<Suspense fallback={<EditorFallback />}><OrdersDesk /></Suspense>} />
          <Route path="/admin/orders/new" element={<Suspense fallback={<EditorFallback />}><DraftOrder /></Suspense>} />
          <Route path="/admin/orders-legacy" element={<Orders />} />
          <Route path="/admin/orders/:id" element={<OrderDetail />} />
          <Route path="/admin/orders/:id/invoice" element={<OrderInvoice />} />
          <Route path="/admin/orders/:id/print/:doc" element={<Suspense fallback={<EditorFallback />}><OrderPrintDoc /></Suspense>} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/products/:id" element={<ProductForm />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/customers" element={<Customers />} />
          <Route path="/admin/customers/groups" element={<Suspense fallback={<EditorFallback />}><CustomerGroups /></Suspense>} />
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
          <Route path="/admin/settings/legal" element={<SettingsLegal />} />
          <Route path="/admin/settings/advanced" element={<SettingsAdmin />} />
          <Route path="/admin/store" element={<OnlineStore />} />
          <Route path="/admin/growth" element={<Growth />} />
          <Route path="/admin/discounts" element={<Discounts />} />
          <Route path="/admin/content" element={<Content />} />
          <Route path="/admin/markets" element={<Markets />} />
          <Route path="/admin/analytics" element={<Suspense fallback={<EditorFallback />}><Analytics /></Suspense>} />
          <Route path="/admin/insights" element={<Suspense fallback={<EditorFallback />}><Insights /></Suspense>} />
          <Route path="/admin/finance" element={<Suspense fallback={<EditorFallback />}><Finance /></Suspense>} />
          <Route path="/admin/abandoned-carts" element={<AbandonedCarts />} />
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
          <Route path="/:cmsSlug" element={<CmsPage />} />
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
