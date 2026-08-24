import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Edit, Trash2, Eye, EyeOff, ChevronRight, Tag, DollarSign, Calendar } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * BUNDLES — Phase 11 Dedicated Bundle Management
 * Professional interface for product bundle promotions.
 * Uses backend promotion engine with type='bundle'.
 * ========================================================================== */

export default function Bundles() {
  const { auth, toast } = useApp();
  const [bundles, setBundles] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api('/promotions?type=bundle', { token: auth.token });
      setBundles(d.promotions || []);
    } catch { toast('Failed to load bundles'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const toggleBundle = async (bundle) => {
    try {
      await api(`/promotions/${bundle._id}/toggle`, { method: 'PATCH', token: auth.token });
      toast(`${bundle.name} ${bundle.enabled ? 'disabled' : 'enabled'}`);
      load();
    } catch { toast('Failed to toggle'); }
  };

  const deleteBundle = async (bundle) => {
    if (!window.confirm(`Delete bundle "${bundle.name}"?`)) return;
    try {
      await api(`/promotions/${bundle._id}`, { method: 'DELETE', token: auth.token });
      toast('Bundle deleted');
      load();
    } catch { toast('Failed to delete'); }
  };

  const getStatus = (b) => {
    if (!b.enabled) return { label: 'Disabled', class: 'v3-status v3-status-inactive' };
    const now = new Date();
    if (b.startsAt && new Date(b.startsAt) > now) return { label: 'Scheduled', class: 'v3-status v3-status-pending' };
    if (b.endsAt && new Date(b.endsAt) < now) return { label: 'Expired', class: 'v3-status v3-status-inactive' };
    return { label: 'Active', class: 'v3-status v3-status-active' };
  };

  return (
    <AdminLayout title="Bundles">
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link><span>/</span>
            <Link to="/admin/marketing">Marketing</Link><span>/</span>
            <span>Bundles</span>
          </div>
          <h1 className="v3-h-page">Product Bundles</h1>
          <p className="v3-h-small mt-1">Create product bundles with special pricing. Encourage customers to buy complementary products together.</p>
        </div>
        <div className="v3-page-header-right">
          <Link to="/admin/promotions/new?type=bundle" className="v3-btn v3-btn-primary">
            <Plus size={13} /> Create Bundle
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 v3-skeleton rounded-[5px]" />)}</div>
      ) : bundles?.length === 0 ? (
        <div className="v3-card">
          <div className="v3-empty">
            <Package size={28} className="v3-empty-icon" />
            <p className="v3-empty-title">No bundles yet</p>
            <p className="v3-empty-desc">Create product bundles to offer complementary products together at a special price.</p>
            <Link to="/admin/promotions/new?type=bundle" className="v3-btn v3-btn-primary mt-4">
              <Plus size={13} /> Create Your First Bundle
            </Link>
          </div>
        </div>
      ) : (
        <div className="v3-card">
          <div className="v3-table-wrap">
            <table className="v3-table">
              <thead>
                <tr>
                  <th>Bundle</th>
                  <th>Type</th>
                  <th>Discount</th>
                  <th>Schedule</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map(b => {
                  const status = getStatus(b);
                  return (
                    <tr key={b._id}>
                      <td>
                        <div className="text-[13px] font-medium text-[#111]">{b.name}</div>
                        {b.publicLabel && <div className="text-[11px] text-[#9CA3AF] mt-0.5">{b.publicLabel}</div>}
                      </td>
                      <td><span className="text-[12px] text-[#6B7280] capitalize">{b.type || 'bundle'}</span></td>
                      <td>
                        <div className="text-[13px] font-medium v3-tabular">
                          {b.type === 'percent' ? `${b.value}%` : pkr(b.value || 0)}
                        </div>
                        {b.limits?.maxTotalDiscount > 0 && (
                          <div className="text-[11px] text-[#9CA3AF]">Max {pkr(b.limits.maxTotalDiscount)}</div>
                        )}
                      </td>
                      <td>
                        <div className="text-[12px] text-[#6B7280]">
                          {b.startsAt ? new Date(b.startsAt).toLocaleDateString() : 'Any time'}
                        </div>
                        {b.endsAt && <div className="text-[11px] text-[#9CA3AF]">Until {new Date(b.endsAt).toLocaleDateString()}</div>}
                      </td>
                      <td>
                        <div className="text-[13px] v3-tabular">{b.usedCount || 0}</div>
                        {b.limits?.maxUses > 0 && <div className="text-[11px] text-[#9CA3AF]">of {b.limits.maxUses}</div>}
                      </td>
                      <td><span className={status.class}><span className="v3-status-dot" />{status.label}</span></td>
                      <td className="right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/admin/promotions/${b._id}`} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Edit">
                            <Edit size={13} />
                          </Link>
                          <button onClick={() => toggleBundle(b)} className="v3-btn v3-btn-icon v3-btn-ghost sm" title={b.enabled ? 'Disable' : 'Enable'}>
                            {b.enabled ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button onClick={() => deleteBundle(b)} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
