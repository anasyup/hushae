import { useEffect } from 'react';
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
import NotFound from './pages/NotFound';

import AdminLogin from './admin/AdminLogin';
import Dashboard from './admin/Dashboard';
import Orders from './admin/Orders';
import OrderDetail from './admin/OrderDetail';
import Products from './admin/Products';
import ProductForm from './admin/ProductForm';
import Categories from './admin/Categories';
import Customers from './admin/Customers';
import SettingsAdmin from './admin/Settings';
import Growth from './admin/Growth';
import Discounts from './admin/Discounts';
import Content from './admin/Content';
import Markets from './admin/Markets';
import Analytics from './admin/Analytics';
import Apps from './admin/Apps';
import WhatsAppFloat from './components/WhatsAppFloat';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname, search]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      {!isAdmin && <Header />}
      <main className="flex-1">
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

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/orders" element={<Orders />} />
          <Route path="/admin/orders/:id" element={<OrderDetail />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/products/:id" element={<ProductForm />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/customers" element={<Customers />} />
          <Route path="/admin/settings" element={<SettingsAdmin />} />
          <Route path="/admin/growth" element={<Growth />} />
          <Route path="/admin/discounts" element={<Discounts />} />
          <Route path="/admin/content" element={<Content />} />
          <Route path="/admin/markets" element={<Markets />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/apps" element={<Apps />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <CartDrawer />}
      {!isAdmin && <WhatsAppFloat />}
      <Toasts />
    </div>
  );
}

function ShopWithCategory() {
  const { slug } = useParams();
  return <Shop key={slug} preset={{ category: slug }} />;
}
