import { NavLink } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SETTINGS_GROUPS } from './settingsNav';

/* ============================================================================
 * SETTINGS RAIL — the settings console's own sidebar.
 *
 * The main admin sidebar carries a single "Settings" entry; every settings
 * destination lives here instead, organised exactly like the reference
 * (group label + indented items). Rendered by AdminLayout on any
 * /admin/settings/* route so the rail persists across the real editors.
 * ========================================================================== */

export default function SettingsRail() {
  return (
    <nav className="set-rail" aria-label="Settings">
      <NavLink to="/admin" className="set-back" title="Back to admin">
        <ArrowLeft size={14} strokeWidth={1.5} />
        <span>Admin</span>
      </NavLink>
      <p className="adm-eyebrow set-title">Settings</p>
      {SETTINGS_GROUPS.map((group) => (
        <div key={group.label} className="adm-section">
          <p className="set-group">{group.label}</p>
          <div className="set-kids">
            {(group.children || []).map((child) => {
              const Icon = child.icon;
              return (
                <NavLink
                  key={child.to + child.label}
                  to={child.to}
                  end
                  className={({ isActive }) => `adm-row set-item ${isActive ? 'is-active' : ''}`}
                >
                  <span className="adm-ico"><Icon size={14} strokeWidth={1.5} /></span>
                  <span className="adm-txt">{child.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
