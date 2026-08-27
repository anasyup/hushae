import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * ADMIN RESERVED PANE — honest destination for admin routes whose dedicated
 * screen has not been built yet (the settings console has SettingsReserved;
 * this is the same promise for the rest of the admin). Never a 404, never a
 * fake form: the pane says what this destination is and points to the nearest
 * real home.
 * ========================================================================== */

const PAGES = {
  '/admin/products/attributes': {
    group: 'Products',
    title: 'Attributes & Variants',
    copy: 'Variant options (sizes, colours, fabrics) live on each product page today. A shared option library — define once, reuse across products — ships in a later phase. Nothing here is hidden or lost.',
    nearest: { to: '/admin/products', label: 'Products' },
  },
  '/admin/products/digital': {
    group: 'Products',
    title: 'Digital Products',
    copy: 'HUSHAE sells physical goods today, so digital products are reserved rather than faked. The moment the business needs downloads or licences, this destination gets a real editor.',
    nearest: { to: '/admin/products', label: 'Products' },
  },
  '/admin/products/settings': {
    group: 'Products',
    title: 'Product Settings',
    copy: 'Store-wide product behaviour (default units, review policy, low-stock line) is being scoped as a dedicated editor. Until then, weight units live under Settings → Store Settings, and review moderation under Reviews & Questions.',
    nearest: { to: '/admin/settings/units', label: 'Weight Unit' },
  },
};

export default function AdminReserved() {
  const { pathname } = useLocation();
  const hit = PAGES[pathname];

  return (
    <AdminLayout title={hit ? hit.title : 'Reserved'}>
      <div className="set-reserved">
        <p className="adm-eyebrow">{hit ? hit.group : 'Admin'}</p>
        <h2 className="set-reserved-title">{hit ? hit.title : 'Reserved destination'}</h2>
        <p className="set-reserved-desc">
          {hit ? hit.copy : 'This screen is a reserved destination in the admin console. The route is live and wired into the sidebar; its dedicated screen ships in a later pass. Nothing here is hidden or lost.'}
        </p>
        <div className="set-reserved-actions">
          {hit?.nearest && (
            <Link to={hit.nearest.to} className="adm-chip solid">
              Open nearest screen — {hit.nearest.label}
            </Link>
          )}
          <Link to="/admin" className="adm-chip">
            <ArrowLeft size={14} strokeWidth={1.5} />
            Overview
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
