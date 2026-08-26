import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext';

/* ============================================================================
 * ATELIER dark sidebar — ported VERBATIM from the reference theme
 * (orders_overview_theme.html / overview_perfect_final.html). Same CSS values,
 * same markup; nav items are wired to the app's real admin routes and the
 * user box / health card are bound to live data.
 * The sidebar is PERMANENTLY OPEN by default at every screen size
 * (190px wide, 168px on <=900px). The topbar hamburger (window event
 * 'atelier-nav') can temporarily slide it away; it returns open on the
 * next page.
 * ======================================================================== */

const SB_CSS = `
.ovp-root{--sidebar:#0f0f0f}
.ovp-root .sidebar{width:190px;background:var(--sidebar);color:#fff;display:flex;flex-direction:column;position:fixed;left:0;top:0;bottom:0;z-index:100;overflow-y:auto;transition:transform .3s}
.ovp-root .sidebar-top{padding:16px 14px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #1e1e1e}
.ovp-root .logo{width:32px;height:32px;background:#fff;border-radius:8px;display:grid;place-items:center;color:#000;font-weight:800;font-size:16px}
.ovp-root .brand b{font-size:13px;letter-spacing:0.5px;display:block;line-height:1}
.ovp-root .brand span{font-size:9px;color:#9ca3af;letter-spacing:0.8px}
.ovp-root .nav{padding:10px 8px;flex:1}
.ovp-root .nav-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:500;color:#9ca3af;cursor:pointer;transition:.15s;margin-bottom:2px;text-decoration:none}
.ovp-root .nav-item:hover{background:#1a1a1a;color:#fff}
.ovp-root .nav-item.active{background:#fff;color:#111;font-weight:600}
.ovp-root .nav-item svg{width:16px;height:16px;flex-shrink:0}
.ovp-root .nav-item .count{margin-left:auto;background:#222;color:#fff;font-size:10px;padding:2px 6px;border-radius:20px;font-weight:600}
.ovp-root .nav-item.active .count{background:#111;color:#fff}
.ovp-root .store-health{margin:12px 8px;background:#1a1a1a;border:1px solid #222;border-radius:12px;padding:12px}
.ovp-root .health-top{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.ovp-root .health-circle{width:44px;height:44px;border-radius:50%;background:conic-gradient(#fff 92%,#333 92%);display:grid;place-items:center;position:relative}
.ovp-root .health-circle::after{content:'';position:absolute;inset:3px;background:#1a1a1a;border-radius:50%}
.ovp-root .health-circle span{position:relative;z-index:1;font-size:11px;font-weight:700}
.ovp-root .health-text b{font-size:11px;display:block}
.ovp-root .health-text p{font-size:10px;color:#9ca3af;line-height:1.3;margin-top:1px}
.ovp-root .btn-health{width:100%;margin-top:10px;background:#fff;color:#111;border:0;border-radius:8px;padding:8px;font-size:11px;font-weight:600;cursor:pointer}
.ovp-root .user-box{padding:12px 10px;border-top:1px solid #1e1e1e;display:flex;align-items:center;gap:10px}
.ovp-root .avatar{width:32px;height:32px;border-radius:50%;background:#333;display:grid;place-items:center;font-size:12px;font-weight:700;flex-shrink:0}
.ovp-root .user-info{flex:1}
.ovp-root .user-info b{font-size:11.5px;display:block}
.ovp-root .user-info span{font-size:10px;color:#9ca3af}
.ovp-root .user-actions{display:flex;gap:6px;margin-top:10px;padding:0 10px 12px}
.ovp-root .ua-btn{width:28px;height:28px;background:#1a1a1a;border:1px solid #222;border-radius:8px;display:grid;place-items:center;cursor:pointer;color:#9ca3af;text-decoration:none}
.ovp-root .ua-btn:hover{background:#222;color:#fff}
.ovp-root .main{margin-left:190px;flex:1;min-width:0;max-width:calc(100% - 190px);transition:margin-left .3s,max-width .3s}
.ovp-root.sb-closed .sidebar{transform:translateX(-100%)}
.ovp-root.sb-closed .main{margin-left:0;max-width:100%}
@media(max-width:900px){
.ovp-root .sidebar{width:168px}
.ovp-root .main{margin-left:168px;max-width:calc(100% - 168px)}
}
`;

const ic = (d, sw = 1.6) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>{d}</svg>
);

const NAV = [
  { key: 'overview', to: '/admin', label: 'Overview', icon: ic(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>, 1.8) },
  { key: 'orders', to: '/admin/orders', label: 'Orders', icon: ic(<><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></>) },
  { key: 'products', to: '/admin/products', label: 'Products', icon: ic(<><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></>) },
  { key: 'customers', to: '/admin/customers', label: 'Customers', icon: ic(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>) },
  { key: 'analytics', to: '/admin/analytics', label: 'Analytics', icon: ic(<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>) },
  { key: 'marketing', to: '/admin/marketing', label: 'Marketing', icon: ic(<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />) },
  { key: 'discounts', to: '/admin/discounts', label: 'Discounts', icon: ic(<><circle cx="7.5" cy="7.5" r="1.5" /><circle cx="16.5" cy="16.5" r="1.5" /><path d="M21 2L2 21" /></>) },
  { key: 'inventory', to: '/admin/ops/inventory', label: 'Inventory', icon: ic(<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />) },
  { key: 'collections', to: '/admin/collections', label: 'Collections', icon: ic(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>) },
  { key: 'returns', to: '/admin/ops/returns', label: 'Returns', icon: ic(<><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>) },
  { key: 'apps', to: '/admin/apps', label: 'Apps', icon: ic(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>) },
  { key: 'reports', to: '/admin/reports', label: 'Reports', icon: ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>) },
  { key: 'settings', to: '/admin/settings', label: 'Settings', icon: ic(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 9 15a1.65 1.65 0 0 0-1-1.51V13a2 2 0 0 1 4 0v.49c.3.23.68.4 1 .51z" /></>) },
];

export default function AtelierSidebar({ active = 'overview', badge = null, health = null, onNotify }) {
  const { auth, logout } = useApp();
  const [open, setOpen] = useState(true); // permanently open by default
  const ref = useRef(null);

  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    window.addEventListener('atelier-nav', toggle);
    return () => window.removeEventListener('atelier-nav', toggle);
  }, []);
  useEffect(() => {
    ref.current?.closest('.ovp-root')?.classList.toggle('sb-closed', !open);
  }, [open]);

  const name = auth?.user?.name || auth?.email || 'Admin';
  const initials = String(name).split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const role = auth?.user?.role === 'admin' ? 'Super Admin' : (auth?.user?.role || 'Admin');
  const pct = Math.max(0, Math.min(100, Math.round(health?.pct ?? 0)));

  return (
    <>
      <style>{SB_CSS}</style>
      <aside ref={ref} className={`sidebar${open ? ' open' : ''}`} aria-label="Admin navigation">
        <div className="sidebar-top"><div className="logo">A</div><div className="brand"><b>ATELIER</b><span>ADMIN PANEL</span></div></div>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.key} to={n.to} className={`nav-item${active === n.key ? ' active' : ''}`}>
              {n.icon} {n.label}{active === n.key && badge != null && <span className="count">{badge}</span>}
            </Link>
          ))}
        </nav>
        {health && (
          <div className="store-health">
            <div className="health-top">
              <div className="health-circle" style={{ background: `conic-gradient(#fff ${pct}%,#333 ${pct}%)` }}><span>{pct}%</span></div>
              <div className="health-text"><b>{health.label}</b><p>{health.text}</p></div>
            </div>
            <button type="button" className="btn-health" onClick={() => onNotify?.(`Store health ${pct}% — ${health.label}`)}>View Health Report</button>
          </div>
        )}
        <div className="user-box">
          <div className="avatar">{initials}</div>
          <div className="user-info"><b>{name}</b><span>{role}</span></div>
        </div>
        <div className="user-actions">
          <Link className="ua-btn" to="/admin/theme" title="Theme"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg></Link>
          <Link className="ua-btn" to="/admin/settings" title="Settings"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3" /></svg></Link>
          <Link className="ua-btn" to="/admin/verification-queue" title="Alerts"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 8a6 6 0 0 1 12 0c0 7 6 5 6 10H0s6-3 6-10" /></svg></Link>
          <div className="ua-btn" title="Log out" role="button" tabIndex={0} onClick={() => logout()} onKeyDown={(e) => { if (e.key === 'Enter') logout(); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg></div>
        </div>
      </aside>
    </>
  );
}
