import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Package, CreditCard, Server, CheckCheck, Inbox as InboxIcon,
  Printer, Layers, AlertTriangle, Star, HelpCircle, TrendingDown,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { ago } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * INBOX — the persistent home of every admin alert.
 *
 * The bell shows the last eight; the Inbox keeps history and lets you triage
 * without noise: five quiet tabs, one-line rows, a single "mark all read".
 * No counters on every tab, no badges on every row — no traffic jam.
 * ========================================================================== */

const ICON = {
  'order.created': Package,
  'order.status': Package,
  'payment.received': CreditCard,
  'payment.expiring': CreditCard,
  'payment.expired': CreditCard,
  'issue.raised': AlertTriangle,
  'print.done': Printer,
  'bulk.done': Layers,
  'stock.low': TrendingDown,
  'review.new': Star,
  'question.new': HelpCircle,
};

const DOT = {
  info: 'var(--adm-label)',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'orders', label: 'Orders' },
  { key: 'payments', label: 'Payments' },
  { key: 'system', label: 'System' },
];

const inTab = (tab, n) => {
  if (tab === 'all') return true;
  if (tab === 'unread') return !n.read;
  if (tab === 'orders') return n.type.startsWith('order.');
  if (tab === 'payments') return n.type.startsWith('payment.') || n.type === 'issue.raised';
  return !n.type.startsWith('order.') && !n.type.startsWith('payment.') && n.type !== 'issue.raised';
};

export default function Inbox() {
  const { auth } = useApp();
  const nav = useNavigate();
  const { tab: tabParam } = useParams();
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam : 'all';

  const [items, setItems] = useState(null);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api('/notifications?limit=50', { token: auth?.token });
      setItems(d.items || []);
      setUnread(d.unread || 0);
    } catch {
      setItems([]);
    }
  }, [auth?.token]);

  useEffect(() => { load(); }, [load]);

  const markAll = async () => {
    setBusy(true);
    try { await api('/notifications/read', { method: 'POST', token: auth.token, body: { all: true } }); await load(); }
    catch { /* silent */ }
    setBusy(false);
  };

  const openItem = async (n) => {
    if (!n.read) {
      try { await api('/notifications/read', { method: 'POST', token: auth.token, body: { id: n.id } }); }
      catch { /* silent */ }
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.link) nav(n.link);
  };

  const rows = (items || []).filter((n) => inTab(tab, n));

  return (
    <AdminLayout title="Inbox">
      <div className="ib-head">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Admin</p>
          <h2 className="ib-title">Inbox{unread > 0 ? ` · ${unread} unread` : ''}</h2>
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAll} disabled={busy} className="adm-chip">
            <CheckCheck size={14} strokeWidth={1.6} />
            {busy ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      <div className="ib-tabs" role="tablist" aria-label="Notification filters">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => nav(t.key === 'all' ? '/admin/inbox' : `/admin/inbox/${t.key}`, { replace: true })}
            className={`ib-tab ${tab === t.key ? 'is-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ib-list">
        {!items && <p className="nb-empty">Loading…</p>}
        {items && rows.length === 0 && (
          <div className="ib-empty">
            <InboxIcon size={22} strokeWidth={1.4} style={{ color: 'var(--adm-label)' }} />
            <p className="ib-empty-t">You’re all caught up.</p>
            <p className="ib-empty-b">New orders, payments and alerts will land here the moment they happen.</p>
          </div>
        )}
        {items && rows.map((n) => {
          const Icon = ICON[n.type] || Server;
          return (
            <button
              type="button"
              key={n.id}
              onClick={() => openItem(n)}
              className={`ib-row ${n.read ? 'read' : ''}`}
            >
              <span className="nb-dot" style={{ background: DOT[n.severity] || DOT.info }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="nb-t flex items-center gap-2">
                  <Icon size={14} strokeWidth={1.6} className="shrink-0 opacity-70" />
                  <span className="truncate">{n.title}</span>
                </span>
                {n.body && <span className="nb-b" style={{ WebkitLineClamp: 2 }}>{n.body}</span>}
                <span className="nb-at">{ago(n.at)}{n.orderNumber ? ` · ${n.orderNumber}` : ''}</span>
              </span>
              {!n.read && <span className="ib-unread" aria-label="Unread" />}
            </button>
          );
        })}
      </div>
    </AdminLayout>
  );
}
