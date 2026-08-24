import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Plus, Edit, Trash2, Eye, EyeOff, Clock, Calendar, TrendingUp } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * FLASH SALES — Phase 11 Dedicated Flash Sale Management
 * Time-limited promotions with urgency indicators.
 * Uses backend promotion engine with type='flash'.
 * ========================================================================== */

export default function FlashSales() {
  const { auth, toast } = useApp();
  const [sales, setSales] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api('/promotions?type=flash', { token: auth.token });
      setSales(d.promotions || []);
    } catch { toast('Failed to load flash sales'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const toggleSale = async (sale) => {
    try {
      await api(`/promotions/${sale._id}/toggle`, { method: 'PATCH', token: auth.token });
      toast(`${sale.name} ${sale.enabled ? 'disabled' : 'enabled'}`);
      load();
    } catch { toast('Failed to toggle'); }
  };

  const deleteSale = async (sale) => {
    if (!window.confirm(`Delete flash sale "${sale.name}"?`)) return;
    try {
      await api(`/promotions/${sale._id}`, { method: 'DELETE', token: auth.token });
      toast('Flash sale deleted');
      load();
    } catch { toast('Failed to delete'); }
  };

  const getStatus = (s) => {
    if (!s.enabled) return { label: 'Disabled', class: 'v3-status v3-status-inactive', icon: null };
    const now = new Date();
    const start = s.startsAt ? new Date(s.startsAt) : null;
    const end = s.endsAt ? new Date(s.endsAt) : null;
    if (start && start > now) return { label: 'Scheduled', class: 'v3-status v3-status-pending', icon: Calendar };
    if (end && end < now) return { label: 'Expired', class: 'v3-status v3-status-inactive', icon: null };
    if (start && end) {
      const remaining = end - now;
      const hours = Math.floor(remaining / 3600000);
      return { label: hours > 0 ? `Live · ${hours}h left` : 'Live · Ending soon', class: 'v3-status v3-status-strong', icon: Zap };
    }
    return { label: 'Active', class: 'v3-status v3-status-active', icon: Zap };
  };

  return (
    <AdminLayout title="Flash Sales">
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link><span>/</span>
            <Link to="/admin/marketing">Marketing</Link><span>/</span>
            <span>Flash Sales</span>
          </div>
          <h1 className="v3-h-page">Flash Sales</h1>
          <p className="v3-h-small mt-1">Time-limited promotions that create urgency. Set start and end times to automatically activate and expire.</p>
        </div>
        <div className="v3-page-header-right">
          <Link to="/admin/promotions/new?type=flash" className="v3-btn v3-btn-primary">
            <Zap size={13} /> Create Flash Sale
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-40 v3-skeleton rounded-[5px]" />)}</div>
      ) : sales?.length === 0 ? (
        <div className="v3-card">
          <div className="v3-empty">
            <Zap size={28} className="v3-empty-icon" />
            <p className="v3-empty-title">No flash sales yet</p>
            <p className="v3-empty-desc">Create time-limited offers to drive urgency and boost conversions.</p>
            <Link to="/admin/promotions/new?type=flash" className="v3-btn v3-btn-primary mt-4">
              <Zap size={13} /> Create Your First Flash Sale
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sales.map(s => {
            const status = getStatus(s);
            const StatusIcon = status.icon;
            return (
              <div key={s._id} className="v3-card">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[#111] truncate">{s.name}</div>
                      {s.publicLabel && <div className="text-[12px] text-[#6B7280] mt-0.5">{s.publicLabel}</div>}
                    </div>
                    <span className={status.class}>
                      {StatusIcon && <StatusIcon size={10} />}
                      <span className="v3-status-dot" />
                      {status.label}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider font-medium">Discount</span>
                      <span className="text-[14px] font-semibold v3-tabular text-[#111]">
                        {s.type === 'percent' ? `${s.value}% off` : `${pkr(s.value)} off`}
                      </span>
                    </div>
                    {s.startsAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider font-medium">Start</span>
                        <span className="text-[12px] text-[#6B7280]">{new Date(s.startsAt).toLocaleString()}</span>
                      </div>
                    )}
                    {s.endsAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider font-medium">End</span>
                        <span className="text-[12px] text-[#6B7280]">{new Date(s.endsAt).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider font-medium">Redemptions</span>
                      <span className="text-[13px] v3-tabular text-[#111]">
                        {s.usedCount || 0}{s.limits?.maxUses ? ` / ${s.limits.maxUses}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-3 border-t border-[#F0F1F3]">
                    <Link to={`/admin/promotions/${s._id}`} className="v3-btn v3-btn-secondary v3-btn-sm flex-1">
                      <Edit size={12} /> Edit
                    </Link>
                    <button onClick={() => toggleSale(s)} className="v3-btn v3-btn-icon v3-btn-ghost sm" title={s.enabled ? 'Disable' : 'Enable'}>
                      {s.enabled ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => deleteSale(s)} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
