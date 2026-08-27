import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Package, CreditCard, Printer, Layers, AlertTriangle, Star, HelpCircle, TrendingDown,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { ago } from '../../lib/format';

/* ============================================================================
 * NOTIFICATION BELL — the admin's live alert surface.
 *
 * The bell is deliberately calm: eight most-recent alerts, a severity dot,
 * one-line bodies, and a "View all" door into the full Inbox. History and
 * triage live on /admin/inbox — the dropdown never becomes a traffic jam.
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

export default function NotificationBell() {
  const { auth } = useApp();
  const nav = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });

  const load = async () => {
    try {
      const d = await api('/notifications?limit=8', { token: auth?.token });
      setData({ items: d.items || [], unread: d.unread || 0 });
    } catch { /* the bell never shouts about itself */ }
  };

  useEffect(() => {
    if (!auth?.token) return undefined;
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [auth?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const markAll = async () => {
    setBusy(true);
    try { await api('/notifications/read', { method: 'POST', token: auth.token, body: { all: true } }); await load(); }
    catch { /* silent */ }
    setBusy(false);
  };

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      try { await api('/notifications/read', { method: 'POST', token: auth.token, body: { id: n.id } }); }
      catch { /* silent */ }
    }
    if (n.link) nav(n.link);
  };

  const viewAll = () => {
    setOpen(false);
    nav('/admin/inbox');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tb-icon"
        aria-label={`Notifications${data.unread ? ` — ${data.unread} unread` : ''}`}
        title="Notifications"
        aria-expanded={open}
      >
        <Bell size={14} strokeWidth={1.8} />
        {data.unread > 0 && <span className="tb-badge">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>

      {open && (
        <div className="nb-panel" role="dialog" aria-label="Notifications">
          <div className="nb-head">
            <p className="nb-title">
              Notifications{data.unread > 0 ? ` · ${data.unread} new` : ''}
            </p>
            {data.unread > 0 && (
              <button type="button" onClick={markAll} disabled={busy} className="nb-act">
                {busy ? 'Marking…' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="nb-list">
            {data.items.length === 0 ? (
              <p className="nb-empty">You’re all caught up.</p>
            ) : data.items.map((n) => {
              const Icon = ICON[n.type] || Package;
              return (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`nb-row ${n.read ? 'read' : ''}`}
                >
                  <span className="nb-dot" style={{ background: DOT[n.severity] || DOT.info }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="nb-t flex items-center gap-2">
                      <Icon size={13} strokeWidth={1.6} className="shrink-0 opacity-70" />
                      <span className="truncate">{n.title}</span>
                    </span>
                    {n.body && <span className="nb-b">{n.body}</span>}
                    <span className="nb-at">{ago(n.at)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="nb-foot">
            <button type="button" onClick={viewAll} className="nb-act">
              View all in Inbox →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
