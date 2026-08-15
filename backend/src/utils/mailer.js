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
  // Try environment variables first
  let host = process.env.SMTP_HOST || '';
  let port = Number(process.env.SMTP_PORT || 587);
  let user = process.env.SMTP_USER || '';
  let pass = process.env.SMTP_PASS || '';
  let from = process.env.SMTP_FROM || '';
  let secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

  // Fallback to database Settings
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
    console.error('[mail] send failed:', e.message);
    return { ok: false, error: e.message };
  }
}

/* ---------------- Template helpers ---------------- */
const pkr = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Public site origin used in email links. Prefers the configured env var,
// then falls back to the live Vercel alias. Never hardcoded per-template.
function siteUrl() {
  return (process.env.PUBLIC_SITE_URL || process.env.PUBLIC_URL || 'https://hushae1.vercel.app').replace(/\/$/, '');
}

function baseLayout({ title, body }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
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
      Need help? Reply to this email or visit <a href="${siteUrl()}/track" style="color:#111;">Track your order</a>
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

// Default static templates (Fallback + Seeding)
const DEFAULT_TEMPLATES = {
  order_confirmation: {
    name: 'Order Confirmation',
    subject: 'Order {orderNumber} confirmed — Thank you',
    variables: ['customerName', 'orderNumber', 'total', 'deliveryAddress', 'productsList', 'storeName'],
    bodyHTML: `<p style="font-size:16px;margin:0 0 8px;">Hi {customerName},</p>
<p style="font-size:14px;line-height:1.7;color:#333;margin:0 0 24px;">
  Thank you for your order! We're preparing it right now — you'll get another email as soon as it ships.
</p>

<div style="background:#FFFFFF;border-radius:12px;padding:16px;margin-bottom:24px;">
  <div style="font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;">Order number</div>
  <div style="font-family:monospace;font-size:18px;font-weight:700;margin-top:4px;">{orderNumber}</div>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
  <thead>
    <tr>
      <th style="text-align:left;padding:8px 8px 12px;font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;border-bottom:1px solid #111;">Item</th>
      <th style="text-align:right;padding:8px 8px 12px;font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;border-bottom:1px solid #111;">Total</th>
    </tr>
  </thead>
  <tbody>{productsList}</tbody>
</table>

<div style="border-top:1px solid #e4ded4;padding-top:16px;">
  <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;margin-top:12px;padding-top:12px;border-top:1px solid #111;">
    <span>Total</span><span>{total}</span>
  </div>
</div>

<div style="margin-top:24px;padding-top:24px;border-top:1px solid #e4ded4;">
  <div style="font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;margin-bottom:8px;">Delivery to</div>
  <div style="font-size:13px;font-weight:600;">{customerName}</div>
  <div style="font-size:12px;color:#333;margin-top:8px;">{deliveryAddress}</div>
</div>

<div style="text-align:center;margin-top:32px;">
  <a href="${siteUrl()}/track"
     style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:99px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">
    Track your order
  </a>
</div>`
  },
  new_order_alert: {
    name: 'New Order Alert (Admin)',
    subject: 'New order {orderNumber} — {total} · {city}',
    variables: ['orderNumber', 'total', 'customerName', 'customerPhone', 'customerEmail', 'city', 'paymentMethod', 'paymentStatus', 'productsList', 'storeName'],
    bodyHTML: `<p style="font-size:16px;margin:0 0 16px;font-weight:600;">🛍️ New order received</p>

<div style="background:#FFFFFF;border-radius:12px;padding:16px;margin-bottom:20px;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-family:monospace;font-size:15px;font-weight:700;">{orderNumber}</div>
    </div>
    <div style="font-size:20px;font-weight:700;">{total}</div>
  </div>
</div>

<table style="width:100%;font-size:12px;color:#333;margin-bottom:16px;">
  <tr><td style="padding:4px 0;color:#7a736d;width:120px;">Customer</td><td style="padding:4px 0;font-weight:600;">{customerName}</td></tr>
  <tr><td style="padding:4px 0;color:#7a736d;">Phone</td><td style="padding:4px 0;font-family:monospace;">{customerPhone}</td></tr>
  <tr><td style="padding:4px 0;color:#7a736d;">Email</td><td style="padding:4px 0;">{customerEmail}</td></tr>
  <tr><td style="padding:4px 0;color:#7a736d;">City</td><td style="padding:4px 0;">{city}</td></tr>
  <tr><td style="padding:4px 0;color:#7a736d;">Payment</td><td style="padding:4px 0;">{paymentMethod} · {paymentStatus}</td></tr>
</table>

<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
  <tbody>{productsList}</tbody>
</table>

<div style="text-align:center;margin-top:24px;">
  <a href="${siteUrl()}/admin"
     style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:99px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">
    Open in admin
  </a>
</div>`
  },
  status_update: {
    name: 'Status Update',
    subject: '{statusTitle} — Order {orderNumber}',
    variables: ['customerName', 'orderNumber', 'statusTitle', 'statusText', 'trackingNumber', 'courierName', 'storeName'],
    bodyHTML: `<p style="font-size:16px;margin:0 0 8px;">Hi {customerName},</p>
<p style="font-size:14px;line-height:1.7;color:#333;margin:0 0 24px;">{statusText}</p>

<div style="background:#FFFFFF;border-radius:12px;padding:16px;margin-bottom:20px;">
  <div style="font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;">Order</div>
  <div style="font-family:monospace;font-size:15px;font-weight:700;margin-top:4px;">{orderNumber}</div>
  <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e4ded4;">
    <div style="font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;">Tracking</div>
    <div style="font-size:13px;font-weight:600;margin-top:4px;">{courierName} · <span style="font-family:monospace;">{trackingNumber}</span></div>
  </div>
</div>

<div style="text-align:center;margin-top:24px;">
  <a href="${siteUrl()}/track"
     style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:99px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">
    Track your order
  </a>
</div>`
  },
  abandoned_cart: {
    name: 'Abandoned Cart',
    subject: 'Your bag is waiting — 10% off inside',
    variables: ['customerName', 'productsList', 'storeName'],
    bodyHTML: `<p style="font-size:16px;margin:0 0 8px;">Hi {customerName},</p>
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
  <tbody>{productsList}</tbody>
</table>

<div style="text-align:center;margin-top:28px;">
  <a href="${siteUrl()}/cart"
     style="display:inline-block;background:#111;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">
    Return to your bag
  </a>
</div>`
  },
  loyalty_reward: {
    name: 'Loyalty / Welcome Reward',
    subject: 'A little thank-you inside — {discountPercent}% off, on us',
    variables: ['customerName', 'discountCode', 'discountPercent', 'expiryDate', 'storeName'],
    bodyHTML: `<p style="margin:0 0 14px;font-size:16px;">Dear {customerName},</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.55;">You're part of the HUSHAE inner circle now. As a small thank you for coming back, here's a code just for you.</p>
<div style="text-align:center;margin:26px 0;padding:24px;border:1px dashed #C9BFB4;background:#FFFFFF;border-radius:14px;">
  <p style="margin:0;font-size:11px;letter-spacing:.24em;color:#7A736D;text-transform:uppercase;">Your reward</p>
  <p style="margin:8px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;letter-spacing:.16em;">{discountCode}</p>
  <p style="margin:10px 0 0;font-size:13px;color:#7A736D;">{discountPercent}% off your next order</p>
  <p style="margin:6px 0 0;font-size:11px;color:#9C948C;">Valid until {expiryDate}</p>
</div>
<p style="margin:0 0 12px;font-size:13px;color:#7A736D;line-height:1.55;">
  Just paste this code at checkout to redeem. It's yours to use once, at your leisure.
</p>`
  },
  review_request: {
    name: 'Review Request',
    subject: 'How do your HUSHAE pieces fit?',
    variables: ['customerName', 'productsList', 'storeName'],
    bodyHTML: `<p style="font-size:16px;margin:0 0 8px;">Hi {customerName},</p>
<p style="font-size:14px;line-height:1.7;color:#333;margin:0 0 20px;">
  We hope you are loving your recent purchase from HUSHAE! Could you please take a moment to let us know how your new pieces fit? Your feedback helps other customers and helps us refine our fits.
</p>

<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
  <thead><tr>
    <th style="text-align:left;padding:8px 8px 12px;font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;border-bottom:1px solid #111;">Your items</th>
    <th style="text-align:right;padding:8px 8px 12px;font-size:10px;letter-spacing:0.2em;color:#7a736d;text-transform:uppercase;border-bottom:1px solid #111;">Quantity</th>
  </tr></thead>
  <tbody>{productsList}</tbody>
</table>

<div style="text-align:center;margin-top:28px;">
  <a href="${siteUrl()}/account"
     style="display:inline-block;background:#111;color:#fff;padding:14px 32px;border-radius:99px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">
    Leave a review
  </a>
</div>`
  }
};

async function getTemplate(key) {
  try {
    const EmailTemplate = require('../models/EmailTemplate');
    let t = await EmailTemplate.findOne({ templateKey: key });
    if (!t && DEFAULT_TEMPLATES[key]) {
      t = await EmailTemplate.create({
        templateKey: key,
        name: DEFAULT_TEMPLATES[key].name,
        subject: DEFAULT_TEMPLATES[key].subject,
        bodyHTML: DEFAULT_TEMPLATES[key].bodyHTML,
        variables: DEFAULT_TEMPLATES[key].variables,
        active: true,
      });
    }
    return t;
  } catch (e) {
    console.error('getTemplate error:', e.message);
    return DEFAULT_TEMPLATES[key] || null;
  }
}

function replaceVariables(html, vars) {
  let result = html;
  for (const [k, v] of Object.entries(vars)) {
    // Keep html blocks intact, escape others
    const unescapedKeys = ['productsList', 'statusText', 'body', 'discountCode'];
    const escapedVal = unescapedKeys.includes(k) ? v : esc(v);
    result = result.replace(new RegExp(`{${k}}`, 'g'), escapedVal);
  }
  return result;
}

/* Customer — order confirmation */
async function sendOrderConfirmation(order, storeInfo = {}) {
  if (!order?.customerInfo?.email) return { skipped: true, reason: 'no customer email' };
  
  const t = await getTemplate('order_confirmation');
  if (!t || !t.active) return { skipped: true, reason: 'disabled or missing' };

  const c = order.customerInfo;
  const deliveryAddress = `${c.address}, ${c.city}, ${c.province} — ${c.postalCode} (${c.phone})`;
  const productsList = orderRowsHtml(order.items);
  
  const vars = {
    customerName: c.name,
    orderNumber: order.orderNumber,
    total: pkr(order.total),
    deliveryAddress,
    productsList,
    storeName: storeInfo.storeName || 'HUSHAE',
  };

  const subject = replaceVariables(t.subject, vars);
  const html = replaceVariables(t.bodyHTML, vars);

  return sendMail({
    to: c.email,
    subject,
    html: baseLayout({ title: 'Order confirmed', body: html }),
  });
}

/* Admin — new order alert */
async function sendNewOrderAlert(order, storeInfo = {}) {
  const adminEmail = storeInfo.adminEmail || process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return { skipped: true, reason: 'no admin email' };

  const t = await getTemplate('new_order_alert');
  if (!t || !t.active) return { skipped: true, reason: 'disabled or missing' };

  const c = order.customerInfo || {};
  const productsList = orderRowsHtml(order.items);

  const vars = {
    orderNumber: order.orderNumber,
    total: pkr(order.total),
    customerName: c.name || 'Guest',
    customerPhone: c.phone || '—',
    customerEmail: c.email || '—',
    city: c.city || 'PK',
    paymentMethod: order.paymentMethod || 'COD',
    paymentStatus: order.paymentStatus || 'Pending',
    productsList,
    storeName: storeInfo.storeName || 'HUSHAE',
  };

  const subject = replaceVariables(t.subject, vars);
  const html = replaceVariables(t.bodyHTML, vars);

  return sendMail({
    to: adminEmail,
    subject,
    html: baseLayout({ title: 'New order', body: html }),
  });
}

/* Customer — status change (Shipped / Delivered) */
async function sendStatusUpdate(order, storeInfo = {}) {
  if (!order?.customerInfo?.email) return { skipped: true, reason: 'no customer email' };
  
  const t = await getTemplate('status_update');
  if (!t || !t.active) return { skipped: true, reason: 'disabled or missing' };

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
  
  const vars = {
    customerName: c.name,
    orderNumber: order.orderNumber,
    statusTitle: info.title,
    statusText: info.text,
    trackingNumber: order.trackingNumber || 'Pending',
    courierName: order.courierName || 'Courier',
    storeName: storeInfo.storeName || 'HUSHAE',
  };

  const subject = replaceVariables(t.subject, vars);
  const html = replaceVariables(t.bodyHTML, vars);

  return sendMail({
    to: c.email,
    subject,
    html: baseLayout({ title: info.title, body: html }),
  });
}

/* Abandoned cart recovery email */
async function sendAbandonedCartRecovery(cart) {
  if (!cart?.email) return { skipped: true, reason: 'no email' };
  
  const t = await getTemplate('abandoned_cart');
  if (!t || !t.active) return { skipped: true, reason: 'disabled or missing' };

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

  const vars = {
    customerName: cart.name || 'there',
    productsList: rowsHtml,
    storeName: 'HUSHAE',
  };

  const subject = replaceVariables(t.subject, vars);
  const html = replaceVariables(t.bodyHTML, vars);

  return sendMail({
    to: cart.email,
    subject,
    html: baseLayout({ title: 'Your bag is waiting', body: html }),
  });
}

async function sendLoyaltyReward(order, discount) {
  const c = order.customerInfo || {};
  if (!c.email) return { ok: false, reason: 'no-email' };
  
  const t = await getTemplate('loyalty_reward');
  if (!t || !t.active) return { skipped: true, reason: 'disabled or missing' };

  const vars = {
    customerName: c.name?.split(' ')[0] || 'friend',
    discountCode: discount.code,
    discountPercent: String(discount.percent || discount.value),
    expiryDate: new Date(discount.expiresAt).toLocaleDateString('en-PK'),
    storeName: 'HUSHAE',
  };

  const subject = replaceVariables(t.subject, vars);
  const html = replaceVariables(t.bodyHTML, vars);

  return sendMail({
    to: c.email,
    subject,
    html: baseLayout({ title: 'Thank you for coming back', body: html }),
  });
}

async function sendReviewRequest(order, storeInfo = {}) {
  const c = order.customerInfo || {};
  if (!c.email) return { skipped: true, reason: 'no-email' };

  const t = await getTemplate('review_request');
  if (!t || !t.active) return { skipped: true, reason: 'disabled or missing' };

  const rowsHtml = (order.items || []).map((i) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;">
        <div style="font-weight:600;font-size:13px;">${esc(i.name)}</div>
        <div style="font-size:11px;color:#7a736d;margin-top:2px;">${esc(i.color || '')}${i.size ? ' · ' + esc(i.size) : ''}</div>
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;text-align:right;font-weight:600;font-size:13px;">
        ${i.quantity}
      </td>
    </tr>`).join('');

  const vars = {
    customerName: c.name || 'friend',
    productsList: rowsHtml,
    storeName: 'HUSHAE',
  };

  const subject = replaceVariables(t.subject, vars);
  const html = replaceVariables(t.bodyHTML, vars);

  return sendMail({
    to: c.email,
    subject,
    html: baseLayout({ title: 'Share your fit feedback', body: html }),
  });
}

module.exports = {
  sendMail,
  sendOrderConfirmation,
  sendNewOrderAlert,
  sendStatusUpdate,
  sendAbandonedCartRecovery,
  sendLoyaltyReward,
  sendReviewRequest,
  async sendTest(to) {
    return sendMail({
      to,
      subject: 'HUSHAE — test email',
      html: baseLayout({ title: 'Test', body: '<p style="font-size:14px;">Your email settings are working correctly! 🎉</p>' }),
    });
  },
};
