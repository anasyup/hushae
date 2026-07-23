import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { FolderTree, Gauge, LogOut, PackageSearch, Settings as SettingsIcon, ShoppingBag, Store, Users } from 'lucide-react';
import { useApp } from '../store/AppContext';

const LINKS = [
  ['/admin', 'Dashboard', Gauge],
  ['/admin/orders', 'Orders', ShoppingBag],
  ['/admin/products', 'Products', PackageSearch],
  ['/admin/categories', 'Categories', FolderTree],
  ['/admin/customers', 'Customers', Users],
  ['/admin/settings', 'Settings', SettingsIcon],
];

export default function AdminLayout({ children, title }) {
  const { auth, logout } = useApp();
  const loc = useLocation();
  if (!auth) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  if (auth.user.role !== 'admin') return <Navigate to="/account" replace />;

  return (
    <div className="flex min-h-screen bg-alabaster">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-obsidian text-alabaster md:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <p className="font-display tracking-widest2">V É L O U R A</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-alabaster/50">Admin Console</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {LINKS.map(([to, l, Icon]) => (
            <NavLink key={to} to={to} end={to === '/admin'}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-medium transition ${isActive ? 'bg-alabaster text-obsidian' : 'text-alabaster/60 hover:bg-white/10 hover:text-alabaster'}`}>
              <Icon size={16} /> {l}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-4">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] text-alabaster/60 transition hover:bg-white/10 hover:text-alabaster"><Store size={16} /> View Store</Link>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] text-alabaster/60 transition hover:bg-white/10 hover:text-alabaster"><LogOut size={16} /> Sign Out</button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:pl-60">
        {/* Mobile topbar */}
        <div className="sticky top-0 z-30 flex items-center justify-between bg-obsidian px-4 py-4 text-alabaster md:hidden">
          <p className="font-display tracking-widest2 text-sm">VÉLOURA ADMIN</p>
          <div className="flex gap-1">
            {LINKS.map(([to, l, Icon]) => (
              <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `rounded-lg p-2 ${isActive ? 'bg-alabaster text-obsidian' : 'text-alabaster/60'}`}><Icon size={16} /></NavLink>
            ))}
          </div>
        </div>
        <main className="flex-1 p-4 md:p-8">
          <h1 className="font-display text-3xl">{title}</h1>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
