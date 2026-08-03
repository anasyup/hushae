/**
 * WhatsApp order-alert helper.
 *
 * Two modes:
 *  1) "click" (default, free) — we don't send anything from the server.
 *     Instead the admin panel opens a wa.me URL prefilled with the order
 *     details so the admin can WhatsApp themselves / their customer.
 *  2) "webhook" — if a webhook URL is configured in settings.integrations.whatsapp.webhookUrl
 *     we POST a JSON payload to it (e.g. Make.com / n8n / self-hosted bridge)
 *     that in turn calls the WhatsApp Business Cloud API.
 *
 * Free instant admin alert works right now: on every new order we build a
 * `waAdminLink` and stash it on the order + fire the webhook if present.
 */

async function notifyNewOrder(order, { settings } = {}) {
  try {
    const wa = settings?.integrations?.whatsapp || {};
    const adminPhone = String(wa.adminAlertNumber || wa.number || '').replace(/\D/g, '');
    if (!adminPhone) return;

    const customer = order.customerInfo || {};
    const currency = 'PKR';
    const lines = (order.items || []).slice(0, 5).map(it => `• ${it.name} × ${it.qty} — ${currency} ${it.price * it.qty}`).join('\n');

    const message =
      `🔔 *NEW ORDER — HUSHAE*\n\n` +
      `Order: *${order.orderNumber}*\n` +
      `Customer: ${customer.name || ''}\n` +
      `Phone: ${customer.phone || ''}\n` +
      `City: ${customer.city || ''}\n` +
      `Payment: ${order.paymentMethod}\n` +
      `Total: ${currency} ${order.totals?.grandTotal || order.subtotal || 0}\n\n` +
      `${lines}` +
      (order.items?.length > 5 ? `\n… +${order.items.length - 5} more` : '');

    // click-to-open wa.me URL (works without any API)
    const link = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;

    // optional webhook — silently POST for anyone with a bridge configured
    if (wa.webhookUrl) {
      const https = require('https');
      const { URL } = require('url');
      try {
        const u = new URL(wa.webhookUrl);
        const body = JSON.stringify({ to: adminPhone, message, order });
        const req = https.request({
          hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search,
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        }, () => {});
        req.on('error', () => {});
        req.write(body); req.end();
      } catch { /* invalid URL, ignore */ }
    }

    return { link, message, adminPhone };
  } catch (e) {
    console.warn('[whatsapp] notify failed:', e.message);
  }
}

module.exports = { notifyNewOrder };
