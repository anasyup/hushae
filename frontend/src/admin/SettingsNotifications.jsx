import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdToggle, EdNotice, EdSaveBar, TableSkeleton, EditorialError,
} from './settings/chrome';

/* ============================================================================
 * NOTIFICATIONS — which transactional emails and WhatsApp alerts actually fire.
 *
 * Every toggle defaults to ON. That mirrors the backend: utils/mailer.js reads
 * these with a `?? true` fallback, so a store whose settings document predates
 * this block behaves exactly as it did before this editor existed. Flipping
 * something off here is the only way an email stops.
 * ========================================================================== */

const KINDS = [
  {
    key: 'newOrder',
    label: 'Order confirmation',
    desc: 'Sent to the customer the moment an order is placed.',
    fn: 'sendOrderConfirmation',
  },
  {
    key: 'adminAlerts',
    label: 'New order alert (you)',
    desc: 'Sent to you when an order arrives, so you can confirm COD by phone.',
    fn: 'sendNewOrderAlert',
  },
  {
    key: 'orderStatus',
    label: 'Status updates',
    desc: 'Shipped, out for delivery, delivered, cancelled.',
    fn: 'sendStatusUpdate',
  },
  {
    key: 'abandonedCart',
    label: 'Abandoned cart recovery',
    desc: 'Reminder to shoppers who left a cart behind.',
    fn: 'sendAbandonedCartRecovery',
  },
  {
    key: 'reviewRequest',
    label: 'Review request',
    desc: 'Asks for a review a few days after delivery.',
    fn: 'sendReviewRequest',
  },
  {
    key: 'loyaltyReward',
    label: 'Loyalty reward',
    desc: 'Tells a customer they have earned a reward.',
    fn: 'sendLoyaltyReward',
  },
  {
    key: 'weeklyDigest',
    label: 'Weekly digest',
    desc: 'Your weekly summary of sales and performance.',
    fn: 'sendWeeklyDigest',
  },
];

/* Missing means "on" — matching the backend's `?? true` fallback exactly, so
 * the screen never shows an email as off when it is in fact still sending. */
const on = (v) => (v === undefined || v === null ? true : !!v);

export default function SettingsNotifications() {
  const { auth, toast } = useApp();
  const [n, setN] = useState(null);
  const [original, setOriginal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings/admin', { token: auth?.token })
      .then((d) => {
        const raw = d.settings?.notifications || {};
        const next = {};
        for (const k of KINDS) {
          next[k.key] = { email: on(raw[k.key]?.email), whatsapp: on(raw[k.key]?.whatsapp) };
        }
        setN(next);
        setOriginal(JSON.stringify(next));
      })
      .catch((e) => setErr(e.message || 'Could not load settings'));
  }, [auth?.token]);

  const setOne = (key, channel, value) =>
    setN({ ...n, [key]: { ...n[key], [channel]: value } });

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth?.token, body: { notifications: n } });
      setOriginal(JSON.stringify(n));
      toast('Notification settings saved');
    } catch (e) { toast(e.message || 'Save failed'); }
    setBusy(false);
  };

  if (err) {
    return (
      <AdminLayout title="Notifications">
        <PageHeader title="Notifications" breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Notifications' }]} />
        <EditorialError title="Could not load notifications" description={err} />
      </AdminLayout>
    );
  }
  if (!n) {
    return (
      <AdminLayout title="Notifications">
        <PageHeader title="Notifications" breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Notifications' }]} />
        <TableSkeleton rows={6} />
      </AdminLayout>
    );
  }

  const dirty = JSON.stringify(n) !== original;
  const offCount = KINDS.filter((k) => !n[k.key].email).length;

  return (
    <AdminLayout title="Notifications">
      <PageHeader
        title="Notifications"
        description="Which transactional emails and WhatsApp alerts are sent, and which are switched off."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Notifications' }]}
      />

      <EdNotice>
        Everything here is <b>on by default</b>, which matches how the mailer already behaves.
        Switching one off is the only thing that stops an email — nothing was silently
        disabled by adding this screen.
        {offCount > 0 && (
          <> <b>{offCount} email{offCount === 1 ? '' : 's'} currently off.</b></>
        )}
      </EdNotice>

      <EdSection index={1} title="Email" description="Transactional email sent from your SMTP or stored email config.">
        {KINDS.map((k) => (
          <EdToggle
            key={k.key}
            label={k.label}
            description={k.desc}
            checked={n[k.key].email}
            onChange={(v) => setOne(k.key, 'email', v)}
          />
        ))}
      </EdSection>

      <EdSection
        index={2}
        title="WhatsApp"
        description="Sent through the WhatsApp integration. Requires a number in Settings → Integrations."
      >
        <EdNotice>
          WhatsApp alerts use the number configured under Settings → Integrations. Without a
          number these do nothing even when switched on.
        </EdNotice>
        {KINDS.filter((k) => k.key === 'newOrder' || k.key === 'orderStatus' || k.key === 'adminAlerts').map((k) => (
          <EdToggle
            key={k.key}
            label={k.label}
            description={k.desc}
            checked={n[k.key].whatsapp}
            onChange={(v) => setOne(k.key, 'whatsapp', v)}
          />
        ))}
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setN(JSON.parse(original))} />
    </AdminLayout>
  );
}
