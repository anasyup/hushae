import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { SETTINGS_GROUPS } from './settingsNav';

/* ============================================================================
 * SETTINGS RAIL — the settings console's own sidebar, organised like the
 * reference: single-destination groups are plain icon rows; multi-item
 * groups are collapsible parents whose children are icon-less indented
 * text rows. The group owning the current route auto-expands.
 * ========================================================================== */

export default function SettingsRail() {
  const loc = useLocation();
  /* The group owning the current route starts open (also on first paint —
     SSR included); navigation keeps expanding whichever group you enter. */
  const [open, setOpen] = useState(() => {
    const owner = SETTINGS_GROUPS.find((g) =>
      (g.children || g.items || []).some((c) => c.to === loc.pathname)
    );
    return owner ? { [owner.label]: true } : {};
  });

  /* Deep links must always show where they are: expand the group that owns
     the current route. Same-reference return keeps renders quiet. */
  useEffect(() => {
    const owner = SETTINGS_GROUPS.find((g) =>
      (g.children || g.items || []).some((c) => c.to === loc.pathname)
    );
    if (!owner) return;
    setOpen((prev) => (prev[owner.label] ? prev : { ...prev, [owner.label]: true }));
  }, [loc.pathname]);

  return (
    <nav className="set-rail" aria-label="Settings">
      <div className="set-head">
        <NavLink to="/admin" className="set-back" title="Back to admin">
          <ArrowLeft size={14} strokeWidth={1.5} />
          <span>Admin</span>
        </NavLink>
        <p className="set-title">Settings</p>
      </div>

      {SETTINGS_GROUPS.map((group) => {
        const kids = group.children || group.items || [];
        const Icon = group.icon;

        /* Single destination: one plain row, no nesting. */
        if (kids.length === 1) {
          const child = kids[0];
          return (
            <div key={group.label} className="adm-section">
              <NavLink
                to={child.to}
                end
                title={child.label}
                className={({ isActive }) => `adm-row set-item ${isActive ? 'is-active' : ''}`}
              >
                <span className="adm-ico"><Icon size={15} strokeWidth={1.5} /></span>
                <span className="adm-txt">{child.label}</span>
              </NavLink>
            </div>
          );
        }

        const expanded = !!open[group.label];
        const hasActive = kids.some((c) => c.to === loc.pathname);

        return (
          <div key={group.label} className="adm-section">
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [group.label]: !expanded }))}
              className={`adm-row set-parent ${hasActive ? 'is-active' : ''}`}
              aria-expanded={expanded}
            >
              <span className="adm-ico"><Icon size={15} strokeWidth={1.5} /></span>
              <span className="adm-txt">{group.label}</span>
              <ChevronDown size={14} strokeWidth={1.5} className={`adm-chev ${expanded ? 'is-open' : ''}`} />
            </button>

            {expanded && (
              <div className="set-kids">
                {kids.map((child) => (
                  <NavLink
                    key={child.to + child.label}
                    to={child.to}
                    end
                    title={child.label}
                    className={({ isActive }) => `adm-child ${isActive ? 'is-active' : ''}`}
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
