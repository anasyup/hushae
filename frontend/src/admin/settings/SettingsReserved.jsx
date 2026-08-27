import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AdminLayout from '../AdminLayout';
import { findSettingsItem } from './settingsNav';

/* ============================================================================
 * RESERVED SETTINGS PANE — honest destination for settings items whose
 * dedicated editor has not been built yet. Never a 404, never a fake form:
 * the rail shows where you are, the pane says what this destination is and
 * points back to the nearest working editor when one exists.
 * ========================================================================== */

const NEAREST = [
  { match: /^\/admin\/settings\/(address|timezone|currency|units|domain|languages|notifications)/, to: '/admin/settings/store', label: 'Store Details' },
  { match: /^\/admin\/settings\/(customer-login|guest-checkout|account-fields|customer-privacy)/, to: '/admin/settings/accounts', label: 'Customer Accounts' },
  { match: /^\/admin\/settings\/store-credit/, to: '/admin/settings/loyalty', label: 'Loyalty & Store Credit' },
  { match: /^\/admin\/settings\/(team|roles|permissions|store-access|product-access|order-access|customer-access|finance-access|audit-logs)/, to: '/admin/settings/security', label: 'Security & Access' },
  { match: /^\/admin\/settings\/(delete|migration|retention)/, to: '/admin/settings/backup', label: 'Backup & Export' },
];

export default function SettingsReserved() {
  const { pathname } = useLocation();
  const hit = findSettingsItem(pathname);
  const near = NEAREST.find((n) => n.match.test(pathname));

  return (
    <AdminLayout title={hit ? hit.item.label : 'Settings'}>
      <div className="set-reserved">
        <p className="adm-eyebrow">{hit ? hit.group.label : 'Settings'}</p>
        <h2 className="set-reserved-title">{hit ? hit.item.label : 'Settings'}</h2>
        <p className="set-reserved-desc">
          This screen is a reserved destination in the settings console. The
          route is live and wired into the rail; its dedicated editor ships in
          a later pass. Nothing here is hidden or lost.
        </p>
        <div className="set-reserved-actions">
          {near && (
            <Link to={near.to} className="adm-chip solid">
              Open nearest editor — {near.label}
            </Link>
          )}
          <Link to="/admin/settings" className="adm-chip">
            <ArrowLeft size={14} strokeWidth={1.5} />
            Settings home
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
