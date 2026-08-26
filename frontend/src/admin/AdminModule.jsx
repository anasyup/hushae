import { useLocation, Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';

const TITLES = {
  '/admin/inbox': 'Inbox — All Messages',
  '/admin/inbox/unread': 'Inbox — Unread',
  '/admin/inbox/customers': 'Customer Messages',
  '/admin/inbox/orders': 'Order Alerts',
  '/admin/inbox/products': 'Product Alerts',
  '/admin/inbox/system': 'System Notifications',
  '/admin/workspace/current': 'Current Store',
  '/admin/workspace/all': 'All Stores',
  '/admin/workspace/add': 'Add Store',
  '/admin/workspace/switch': 'Switch Workspace',
  '/admin/workspace/settings': 'Workspace Settings',
  '/admin/catalog': 'Catalog',
  '/admin/fulfillment': 'Fulfillment',
  '/admin/gift-cards': 'Gift Cards',
  '/admin/sms': 'SMS Marketing',
  '/admin/media': 'Media Library',
  '/admin/seo': 'SEO',
  '/admin/help': 'Help & Support',
  '/admin/docs': 'Documentation',
  '/admin/shortcuts': 'Keyboard Shortcuts',
  '/admin/profile': 'Admin Profile',
  '/admin/team': 'Team Members',
  '/admin/billing': 'Plan & Billing',
};

function titleOf(path) {
  if (TITLES[path]) return TITLES[path];
  const bit = path.replace('/admin/', '').replace(/\//g, ' / ');
  return bit.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminModule() {
  const { pathname } = useLocation();
  const title = titleOf(pathname);
  return (
    <AdminLayout title={title}>
      <div className="mx-auto max-w-2xl border border-[#E6E6E6] bg-white p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]">HUSHAE desk</p>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-[#111]">{title}</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-[#555]">
          Yeh option sidebar pe live hai. HUSHAE ke purane desks (orders, inventory, verification, theme)
          waise ke waise kaam karte hain. Yeh naya desk map pe aa gaya hai — data/API wiring next pass.
        </p>
        <p className="mt-2 font-mono text-[11px] text-[#8A8A8A]">{pathname}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/admin" className="inline-flex min-h-[32px] items-center border border-[#111] bg-[#111] px-3 text-[12px] font-semibold text-white">Dashboard</Link>
          <Link to="/admin/orders" className="inline-flex min-h-[32px] items-center border border-[#E6E6E6] bg-white px-3 text-[12px] font-medium">Orders</Link>
          <Link to="/admin/products" className="inline-flex min-h-[32px] items-center border border-[#E6E6E6] bg-white px-3 text-[12px] font-medium">Inventory</Link>
        </div>
      </div>
    </AdminLayout>
  );
}
