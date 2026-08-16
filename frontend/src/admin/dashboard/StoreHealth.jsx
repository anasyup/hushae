import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

/* ============================================================================
 * Store health — no fabricated score. Each line is a real measured signal:
 *   · Payments   → insights.kpis.paymentVerifiedRate
 *   · Orders     → insights.kpis.issueRate
 *   · Inventory  → low-stock count (from dashboard data)
 *   · Shipping   → insights.avgShipHours
 * Status is "Operational" / "Needs attention" / "Attention" — plain words.
 * ========================================================================== */

function Row({ label, value, ok, to, detail }) {
  const tone = ok ? 'var(--px-success)' : 'var(--px-warning)';
  return (
    <Link to={to} className="flex items-center justify-between border-b py-2.5 transition-colors last:border-0 hover:bg-[var(--px-bg-hover)]" style={{ borderColor: 'var(--px-border)' }}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium" style={{ color: 'var(--px-ink)' }}>{label}</p>
        {detail && <p className="text-[11px]" style={{ color: 'var(--px-muted)' }}>{detail}</p>}
      </div>
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: tone }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} aria-hidden="true" />
        {value}
      </span>
    </Link>
  );
}

export default function StoreHealth({ insights, lowStockCount }) {
  if (!insights) return null;
  const k = insights.kpis || {};
  const verified = k.paymentVerifiedRate;
  const issue = k.issueRate;
  const ship = insights.avgShipHours;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--px-muted)' }}>Store health</p>
        <Activity size={14} strokeWidth={1.5} style={{ color: 'var(--px-muted)' }} aria-hidden="true" />
      </div>
      <div className="mt-2">
        <Row label="Payments" value={verified >= 70 ? 'Operational' : 'Needs attention'} ok={verified >= 70} to="/admin/payments" detail={`${verified}% verified`} />
        <Row label="Orders" value={issue <= 5 ? 'Operational' : 'Attention'} ok={issue <= 5} to="/admin/orders?hasIssue=yes" detail={`${issue}% issue rate`} />
        <Row label="Inventory" value={lowStockCount === 0 ? 'Operational' : 'Needs attention'} ok={lowStockCount === 0} to="/admin/products?stock=low" detail={`${lowStockCount} low-stock`} />
        <Row label="Shipping" value={ship > 0 && ship < 96 ? 'On track' : ship === 0 ? 'No data' : 'Slow'} ok={ship > 0 && ship < 96} to="/admin/orders?group=to-ship" detail={ship > 0 ? `${ship}h avg to ship` : 'awaiting first shipment'} />
      </div>
    </div>
  );
}
