// Lightweight email service — works with any SMTP provider (Gmail, custom,
// AWS SES, SendGrid via SMTP, etc). Config is read from environment variables
// or, when unset, falls back to Settings.integrations.email in the database
// so the admin can configure it from the UI without a redeploy.
//
// Env vars (recommended for production):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE
//
// If nothing is configured, emails are logged to the console (no crash).

const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedKey = '';

async function getTransporter() {
  // Try DB settings first (so admin can change without redeploy)
  let host = process.env.SMTP_HOST || '';
  let port = Number(process.env.SMTP_PORT || 587);
  let user = process.env.SMTP_USER || '';
  let pass = process.env.SMTP_PASS || '';
  let from = process.env.SMTP_FROM || '';
  let secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

  if (!host || !user || !pass) {
    try {
      const Settings = require('../models/Settings');
      const s = await Settings.findOne({ key: 'store' }).lean();
      const cfg = s?.integrations?.email;
      if (cfg && cfg.host && cfg.user && cfg.pass) {
        host = cfg.host;
        port = Number(cfg.port || 587);
        user = cfg.user;
        pass = cfg.pass;
        from = cfg.from || cfg.user;
        secure = !!cfg.secure;
      }
    } catch { /* noop */ }
  }

  if (!host || !user || !pass) return null;

  const key = `${host}|${port}|${user}|${secure}`;
  if (cachedTransporter && cachedKey === key) return { transporter: cachedTransporter, from };

  cachedTransporter = nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
    // Reasonable timeouts so a slow SMTP server doesn't hang the API request
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
  cachedKey = key;
  return { transporter: cachedTransporter, from };
}

async function sendMail({ to, subject, html, text, bcc, replyTo }) {
  if (!to || !subject) return { skipped: true, reason: 'missing to/subject' };
  try {
    const t = await getTransporter();
    if (!t) {
      // No transport configured — log so nothing is silently lost
      console.log('[mail] SMTP not configured — would have sent:', { to, subject });
      return { skipped: true, reason: 'smtp not configured' };
    }
    const info = await t.transporter.sendMail({
      from: t.from,
      to, bcc: bcc || undefined,
      replyTo: replyTo || undefined,
      subject,
      html: html || undefined,
      text: text || undefined,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    // Never crash a checkout because of an email failure
    console.error('[mail] send failed:', e.message);
    return { ok: false, error: e.message };
  }
}

/* ---------------- Template helpers ---------------- */
const pkr = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function baseLayout({ title, body }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f7f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #111;">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;letter-spacing:0.32em;">HUSHAE</div>
      <div style="font-size:10px;letter-spacing:0.24em;color:#7a736d;margin-top:4px;text-transform:uppercase;">Premium innerwear · Made in Pakistan</div>
    </div>
    <div style="background:#fff;padding:32px 24px;border:1px solid #e4ded4;border-top:none;">
      ${body}
    </div>
    <div style="text-align:center;padding:20px;color:#7a736d;font-size:11px;line-height:1.6;">
      Discreet packaging on every order · 14-day easy exchange<br>
      Need help? Reply to this email or visit <a href="https://veloura-73q1.vercel.app/track" style="color:#111;">Track your order</a>
    </div>
  </div>
</body></html>`;
}

function orderRowsHtml(items) {
  return (items || []).map((i) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;">
        <div style="font-weight:600;font-size:13px;">${esc(i.name)}</div>
        <div style="font-size:11px;color:#7a736d;margin-top:2px;">
          ${esc(i.color || '')}${i.size ? ' · ' + esc(i.size) : ''} · Qty ${i.quantity}
        </div>
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;text-align:right;font-weight:600;font-size:13px;">
        ${pkr(i.lineTotal || (i.price * i.quantity))}
      </td>
    </tr>`).join('');
}

/* Customer — order confirmation */
async function sendOrderConfirmation(order, storeInfo = {}) {
  if (!order?.customerInfo?.email) return { skipped: true, reason: 'no customer email' };

  const c = order.customerInfo;
  const body = `
    <p style="font-size:16px;margin:0 0 8px;">Hi ${esc(c.name)},</p>
    <p style="font-size:14px;line-height:1.7;color:#333;margin:0 0 24px;">
      Thank you for your order! We're preparing it right now — you'll get another email as soon as it ships.
    </p>

    <div style="background:#f7f5f1;border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;">Order number</div>
      <div style="font-family:monospace;font-size:18px;font-weight:700;margin-top:4px;">${esc(order.orderNumber)}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 8px 12px;font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;border-bottom:1px solid #111;">Item</th>
          <th style="text-align:right;padding:8px 8px 12px;font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;border-bottom:1px solid #111;">Total</th>
        </tr>
      </thead>
      <tbody>${orderRowsHtml(order.items)}</tbody>
    </table>

    <div style="border-top:1px solid #e4ded4;padding-top:16px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#7a736d;margin-bottom:6px;">
        <span>Subtotal</span><span style="color:#111;">${pkr(order.subtotal)}</span>
      </div>
      ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#059669;margin-bottom:6px;">
        <span>Discount${order.couponCode ? ' (' + esc(order.couponCode) + ')' : ''}</span><span>− ${pkr(order.discount)}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#7a736d;margin-bottom:6px;">
        <span>Shipping</span><span style="color:#111;">${order.shippingCharge > 0 ? pkr(order.shippingCharge) : 'Free'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;margin-top:12px;padding-top:12px;border-top:1px solid #111;">
        <span>Total</span><span>${pkr(order.total)}</span>
      </div>
      <div style="text-align:center;margin-top:14px;">
        <span style="display:inline-block;padding:6px 14px;border-radius:99px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;
          background:${order.paymentStatus === 'Paid' ? '#d1fae5' : '#fef3c7'};color:${order.paymentStatus === 'Paid' ? '#065f46' : '#92400e'};">
          ${esc(order.paymentMethod)} · ${esc(order.paymentStatus)}
        </span>
      </div>
    </div>

    <div style="margin-top:24px;padding-top:24px;border-top:1px solid #e4ded4;">
      <div style="font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;margin-bottom:8px;">Delivery to</div>
      <div style="font-size:13px;font-weight:600;">${esc(c.name)}</div>
      <div style="font-size:12px;color:#333;margin-top:2px;">${esc(c.phone)}</div>
      <div style="font-size:12px;color:#333;margin-top:8px;">${esc(c.address)}</div>
      <div style="font-size:12px;color:#7a736d;margin-top:2px;">${esc(c.city)}, ${esc(c.province)} — ${esc(c.postalCode)}</div>
    </div>

    <div style="text-align:center;margin-top:32px;">
      <a href="https://veloura-73q1.vercel.app/track?orderNumber=${esc(order.orderNumber)}&phone=${esc(c.phone)}"
         style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:99px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">
        Track your order
      </a>
    </div>
  `;

  return sendMail({
    to: c.email,
    subject: `Order ${order.orderNumber} confirmed — Thank you`,
    html: baseLayout({ title: 'Order confirmed', body }),
  });
}

/* Admin — new order alert */
async function sendNewOrderAlert(order, storeInfo = {}) {
  const adminEmail = storeInfo.adminEmail || process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return { skipped: true, reason: 'no admin email' };

  const c = order.customerInfo || {};
  const body = `
    <p style="font-size:16px;margin:0 0 16px;font-weight:600;">🛍️ New order received</p>

    <div style="background:#f7f5f1;border-radius:12px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-family:monospace;font-size:15px;font-weight:700;">${esc(order.orderNumber)}</div>
          <div style="font-size:11px;color:#7a736d;margin-top:2px;">${new Date(order.createdAt).toLocaleString('en-PK')}</div>
        </div>
        <div style="font-size:20px;font-weight:700;">${pkr(order.total)}</div>
      </div>
    </div>

    <table style="width:100%;font-size:12px;color:#333;margin-bottom:16px;">
      <tr><td style="padding:4px 0;color:#7a736d;width:120px;">Customer</td><td style="padding:4px 0;font-weight:600;">${esc(c.name)}</td></tr>
      <tr><td style="padding:4px 0;color:#7a736d;">Phone</td><td style="padding:4px 0;font-family:monospace;">${esc(c.phone)}</td></tr>
      <tr><td style="padding:4px 0;color:#7a736d;">Email</td><td style="padding:4px 0;">${esc(c.email || '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#7a736d;">City</td><td style="padding:4px 0;">${esc(c.city)}, ${esc(c.province)}</td></tr>
      <tr><td style="padding:4px 0;color:#7a736d;">Payment</td><td style="padding:4px 0;">${esc(order.paymentMethod)} · ${esc(order.paymentStatus)}</td></tr>
      <tr><td style="padding:4px 0;color:#7a736d;">Items</td><td style="padding:4px 0;">${(order.items || []).length} product${(order.items || []).length === 1 ? '' : 's'}</td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tbody>${orderRowsHtml(order.items)}</tbody>
    </table>

    ${order.paymentMethod === 'COD' ? `<div style="background:#fef3c7;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#92400e;">
      ⚠️ COD order — call the customer to confirm before shipping.
    </div>` : ''}

    <div style="text-align:center;margin-top:24px;">
      <a href="https://veloura-73q1.vercel.app/admin/orders/${order._id}"
         style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:99px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">
        Open in admin
      </a>
    </div>
  `;

  return sendMail({
    to: adminEmail,
    subject: `New order ${order.orderNumber} — ${pkr(order.total)} · ${esc(c.city || 'PK')}`,
    html: baseLayout({ title: 'New order', body }),
  });
}

/* Customer — status change (Shipped / Delivered) */
async function sendStatusUpdate(order, storeInfo = {}) {
  if (!order?.customerInfo?.email) return { skipped: true, reason: 'no customer email' };
  const NICE = {
    Confirmed: { title: 'Your order is confirmed', text: 'We\'ve confirmed your order and are getting it ready for shipping.' },
    Shipped:   { title: 'Your order has shipped', text: 'Your parcel is now on its way. It usually reaches within 2–5 working days.' },
    'Out for Delivery': { title: 'Out for delivery today', text: 'Your parcel is with the courier for delivery today — please keep your phone handy.' },
    Delivered: { title: 'Delivered — thank you', text: 'We hope you love your HUSHAE pieces. Please share how they fit — we would be honored to hear from you.' },
    Cancelled: { title: 'Your order was cancelled', text: 'Your order has been cancelled. If this was unexpected, please reply to this email.' },
  };
  const info = NICE[order.status];
  if (!info) return { skipped: true, reason: 'status not customer-facing' };

  const c = order.customerInfo;
  const body = `
    <p style="font-size:16px;margin:0 0 8px;">Hi ${esc(c.name)},</p>
    <p style="font-size:14px;line-height:1.7;color:#333;margin:0 0 24px;">${esc(info.text)}</p>

    <div style="background:#f7f5f1;border-radius:12px;padding:16px;margin-bottom:20px;">
      <div style="font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;">Order</div>
      <div style="font-family:monospace;font-size:15px;font-weight:700;margin-top:4px;">${esc(order.orderNumber)}</div>
      ${order.trackingNumber ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e4ded4;">
          <div style="font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;">Tracking</div>
          <div style="font-size:13px;font-weight:600;margin-top:4px;">${esc(order.courierName || 'Courier')} · <span style="font-family:monospace;">${esc(order.trackingNumber)}</span></div>
        </div>` : ''}
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="https://veloura-73q1.vercel.app/track?orderNumber=${esc(order.orderNumber)}&phone=${esc(c.phone)}"
         style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:99px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">
        Track your order
      </a>
    </div>
  `;

  return sendMail({
    to: c.email,
    subject: `${info.title} — Order ${order.orderNumber}`,
    html: baseLayout({ title: info.title, body }),
  });
}

/* Abandoned cart recovery email */
async function sendAbandonedCartRecovery(cart) {
  if (!cart?.email) return { skipped: true, reason: 'no email' };
  const rowsHtml = (cart.items || []).map((i) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;">
        <div style="font-weight:600;font-size:13px;">${esc(i.name)}</div>
        <div style="font-size:11px;color:#7a736d;margin-top:2px;">${esc(i.color || '')}${i.size ? ' · ' + esc(i.size) : ''} · Qty ${i.quantity}</div>
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;text-align:right;font-weight:600;font-size:13px;">
        ${pkr((i.price || 0) * (i.quantity || 1))}
      </td>
    </tr>`).join('');

  const body = `
    <p style="font-size:16px;margin:0 0 8px;">Hi ${esc(cart.name || 'there')},</p>
    <p style="font-size:14px;line-height:1.7;color:#333;margin:0 0 20px;">
      You left something behind in your bag. Here's <b>10% off</b> to complete your order — just for you.
    </p>

    <div style="background:#111;color:#fff;text-align:center;padding:18px;border-radius:12px;margin-bottom:24px;">
      <div style="font-size:10px;letter-spacing:0.2em;color:#c9bfb4;text-transform:uppercase;">Your code</div>
      <div style="font-family:monospace;font-size:24px;font-weight:700;letter-spacing:0.14em;margin-top:6px;">COMEBACK10</div>
      <div style="font-size:11px;color:#c9bfb4;margin-top:6px;">Applied automatically at checkout · valid for 48 hours</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead><tr>
        <th style="text-align:left;padding:8px 8px 12px;font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;border-bottom:1px solid #111;">Still waiting for you</th>
        <th style="text-align:right;padding:8px 8px 12px;font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;border-bottom:1px solid #111;">Total</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div style="text-align:center;margin-top:28px;">
      <a href="https://veloura-73q1.vercel.app/cart"
         style="display:inline-block;background:#111;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">
        Return to your bag
      </a>
    </div>

    <p style="text-align:center;margin-top:20px;font-size:11px;color:#7a736d;line-height:1.6;">
      Items in your bag are not reserved. Popular styles sell out quickly.<br>
      Discreet, unmarked packaging on every order.
    </p>
  `;
  return sendMail({
    to: cart.email,
    subject: `Your bag is waiting — 10% off inside`,
    html: baseLayout({ title: 'Your bag is waiting', body }),
  });
}

module.exports = {
  sendMail,
  sendOrderConfirmation,
  sendNewOrderAlert,
  sendStatusUpdate,
  sendAbandonedCartRecovery,
  async sendTest(to) {
    return sendMail({
      to,
      subject: 'HUSHAE — test email',
      html: baseLayout({ title: 'Test', body: '<p style="font-size:14px;">Your email settings are working correctly! 🎉</p>' }),
    });
  },
};
