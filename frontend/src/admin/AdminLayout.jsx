import { useState } from 'react';
import { NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  BadgePercent, BarChart3, ChevronRight, FileText, FolderTree, Globe, Home, LayoutGrid,
  LogOut, Menu, Package, Plus, Settings as SettingsIcon, ShoppingBag, Store, TrendingUp, Users, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';

const MAIN = [
  { to: '/admin', label: 'Home', icon: Home, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/growth', label: 'Growth', icon: TrendingUp },
  { to: '/admin/discounts', label: 'Discounts', icon: BadgePercent },
  { to: '/admin/content', label: 'Content', icon: FileText },
  { to: '/admin/markets', label: 'Markets', icon: Globe },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const linkCls = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-medium transition ${
    isActive ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:bg-white/70 hover:text-neutral-800'
  }`;

function Section({ title, icon: SIcon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-1 text-[13px] font-medium text-neutral-500 transition hover:text-neutral-800">
        <span>{title}</span>
        <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  const { logout } = useApp();
  return (
    <div className="flex h-full flex-col bg-[#ebebeb]">
      <div className="px-4 pb-2 pt-5">
        <p className="font-display tracking-widest2 text-[15px] text-neutral-900">V É L O U R A</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-widest text-neutral-400">Admin Console</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3">
        {MAIN.map(({ to, label, icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkCls} onClick={onNavigate}>
            {({ isActive }) => (
              <>
                {(() => { const Icon = icon; return <Icon size={17} strokeWidth={isActive ? 2.1 : 1.8} />; })()}
                {label}
              </>
            )}
          </NavLink>
        ))}
        {/* Categories nested under Products */}
        <NavLink to="/admin/categories" className={linkCls} onClick={onNavigate}>
          <span className="ml-[26px] flex items-center gap-2.5"><FolderTree size={15} strokeWidth={1.8} /> Categories</span>
        </NavLink>

        <Section title="Sales channels">
          <NavLink to="/admin/store" className={linkCls} onClick={onNavigate}>
            <Store size={17} strokeWidth={1.8} /> Online Store
          </NavLink>
        </Section>

        <Section title="Apps">
          <NavLink to="/admin/apps" className={linkCls} onClick={onNavigate}>
            <Plus size={17} strokeWidth={1.8} /> Integrations
          </NavLink>
        </Section>
      </nav>

      <div className="space-y-0.5 border-t border-black/5 px-2.5 py-3">
        <NavLink to="/admin/settings" className={linkCls} onClick={onNavigate}>
          <SettingsIcon size={17} strokeWidth={1.8} /> Settings
        </NavLink>
        <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] font-medium text-neutral-500 transition hover:bg-white/70 hover:text-neutral-800">
          <LogOut size={17} strokeWidth={1.8} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children, title }) {
  const { auth } = useApp();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  if (!auth) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  if (auth.user.role !== 'admin') return <Navigate to="/account" replace />;

  return (
    <div className="flex min-h-screen bg-alabaster">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-neutral-500 hover:bg-white/70"><X size={18} /></button>
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col md:pl-60">
        {/* Mobile topbar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-[#ebebeb] px-4 py-3 md:hidden">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-1.5 text-neutral-700 hover:bg-white/70"><Menu size={20} /></button>
          <p className="font-display tracking-widest2 text-sm text-neutral-900">VÉLOURA ADMIN</p>
        </div>
        <main className="flex-1 p-4 md:p-8">
          <h1 className="font-display text-3xl">{title}</h1>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
