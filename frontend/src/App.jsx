import { Component, useEffect } from 'react';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
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
import Account from './pages/Account';
import Sale from './pages/Sale';
import Faq from './pages/Faq';
import NotFound from './pages/NotFound';

import AdminLogin from './admin/AdminLogin';
import Dashboard from './admin/Dashboard';
import LiveView from './admin/LiveView';
import Orders from './admin/Orders';
import OrderDetail from './admin/OrderDetail';
import OrderInvoice from './admin/OrderInvoice';
import Products from './admin/Products';
import ProductForm from './admin/ProductForm';
import Categories from './admin/Categories';
import Customers from './admin/Customers';
import SettingsAdmin from './admin/Settings';
import SettingsHub from './admin/SettingsHub';
import { SettingsStore, SettingsPayments, SettingsShipping, SettingsSecurity, SettingsLegal } from './admin/SettingsPages';
import Growth from './admin/Growth';
import Discounts from './admin/Discounts';
import Content from './admin/Content';
import Markets from './admin/Markets';
import Analytics from './admin/Analytics';
import Apps from './admin/Apps';
import Insights from './admin/Insights';
import Finance from './admin/Finance';
import AbandonedCarts from './admin/AbandonedCarts';
import Backup from './admin/Backup';
import Payments from './admin/Payments';
import WhatsAppFloat from './components/WhatsAppFloat';
import StoreLock from './components/StoreLock';
import CookieConsent from './components/CookieConsent';
import PromoPopup from './components/PromoPopup';
import MobileNav from './components/MobileNav';
import OnlineStore from './admin/OnlineStore';
import { track } from './lib/track';
import AnalyticsInjector from './components/Analytics';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname, search]);
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

// Global shield: kisi bhi page ka JS error ab poori site ko blank nahi karega
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false }; }
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(e, info) { console.error('UI crash:', e, info); }
  render() {
    if (this.state.crashed) {
      return (
        <div className="grid min-h-screen place-items-center bg-alabaster px-6">
          <div className="card w-full max-w-sm rounded-[2rem] p-8 text-center shadow-soft">
            <p className="font-display text-xl tracking-widest2">V É L O U R A</p>
            <p className="mt-3 text-sm leading-relaxed text-ash">Something went wrong on this page. Ek dafa reload kar dein — theek ho jayega. Agar phir na chale to support ko batayein.</p>
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

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Tracker />
      {!isAdmin && <Header />}
      <main className="flex-1">
        <ErrorBoundary key={pathname}>
        <StoreLock>
        <Routes>
          <Route path="/" element={<Home />} />
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
          <Route path="/account" element={<Account />} />
          <Route path="/faq" element={<Faq />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/live" element={<LiveView />} />
          <Route path="/admin/orders" element={<Orders />} />
          <Route path="/admin/orders/:id" element={<OrderDetail />} />
          <Route path="/admin/orders/:id/invoice" element={<OrderInvoice />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/products/:id" element={<ProductForm />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/customers" element={<Customers />} />
          <Route path="/admin/settings" element={<SettingsHub />} />
          <Route path="/admin/settings/store" element={<SettingsStore />} />
          <Route path="/admin/settings/payments" element={<SettingsPayments />} />
          <Route path="/admin/settings/shipping" element={<SettingsShipping />} />
          <Route path="/admin/settings/security" element={<SettingsSecurity />} />
          <Route path="/admin/settings/legal" element={<SettingsLegal />} />
          <Route path="/admin/settings/advanced" element={<SettingsAdmin />} />
          <Route path="/admin/store" element={<OnlineStore />} />
          <Route path="/admin/growth" element={<Growth />} />
          <Route path="/admin/discounts" element={<Discounts />} />
          <Route path="/admin/content" element={<Content />} />
          <Route path="/admin/markets" element={<Markets />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/insights" element={<Insights />} />
          <Route path="/admin/finance" element={<Finance />} />
          <Route path="/admin/abandoned-carts" element={<AbandonedCarts />} />
          <Route path="/admin/backup" element={<Backup />} />
          <Route path="/admin/payments" element={<Payments />} />
          <Route path="/admin/apps" element={<Apps />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </StoreLock>
        </ErrorBoundary>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <CartDrawer />}
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
