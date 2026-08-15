const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const EmailTemplate = require('../models/EmailTemplate');
const mailer = require('../utils/mailer');

const router = express.Router();

router.use(protect, adminOnly);

/** GET /api/email-templates */
router.get('/', asyncHandler(async (req, res) => {
  // Let mailer load and seed defaults if empty
  const keys = ['order_confirmation', 'new_order_alert', 'status_update', 'abandoned_cart', 'loyalty_reward', 'review_request'];
  const templates = [];
  for (const k of keys) {
    // This will find or seed
    const t = await mailer.sendMail ? require('../utils/mailer').sendMail : null; // loads mailer
    const template = await EmailTemplate.findOne({ templateKey: k });
    if (template) {
      templates.push(template);
    } else {
      // Force seed
      const EmailTemplateModel = require('../models/EmailTemplate');
      const seedData = {
        templateKey: k,
        name: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        subject: 'Default Subject',
        bodyHTML: '<p>Default Body</p>',
        variables: [],
        active: true
      };
      // Fetching template via mailer will seed it
      const seeded = await require('../utils/mailer').sendMail; // loads and seeds
      const fresh = await EmailTemplateModel.findOne({ templateKey: k });
      if (fresh) templates.push(fresh);
    }
  }
  res.json({ templates });
}));

/** GET /api/email-templates/:key */
router.get('/:key', asyncHandler(async (req, res) => {
  const t = await EmailTemplate.findOne({ templateKey: req.params.key });
  if (!t) return res.status(404).json({ message: 'Template not found' });
  res.json({ template: t });
}));

/** PUT /api/email-templates/:key */
router.put('/:key', asyncHandler(async (req, res) => {
  const { subject, bodyHTML, active } = req.body || {};
  const t = await EmailTemplate.findOne({ templateKey: req.params.key });
  if (!t) return res.status(404).json({ message: 'Template not found' });

  if (subject !== undefined) t.subject = subject;
  if (bodyHTML !== undefined) t.bodyHTML = bodyHTML;
  if (active !== undefined) t.active = active;

  await t.save();
  res.json({ template: t });
}));

/** POST /api/email-templates/:key/test */
router.post('/:key/test', asyncHandler(async (req, res) => {
  const { to } = req.body || {};
  if (!to) return res.status(400).json({ message: 'Recipient email required' });

  const t = await EmailTemplate.findOne({ templateKey: req.params.key });
  if (!t) return res.status(404).json({ message: 'Template not found' });

  // Create mock variables
  const mockVars = {
    customerName: 'Muhammad Anas',
    orderNumber: 'HS-1042',
    total: 'PKR 6,450',
    deliveryAddress: 'House 42, Block C, Gulberg III, Lahore, Punjab — 54000 (+92 300 1234567)',
    productsList: `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;">
          <div style="font-weight:600;font-size:13px;">HUSHAE Winter Thermal Vest</div>
          <div style="font-size:11px;color:#7a736d;margin-top:2px;">White · Medium · Qty 2</div>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;text-align:right;font-weight:600;font-size:13px;">PKR 4,950</td>
      </tr>
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;">
          <div style="font-weight:600;font-size:13px;">Premium Cotton Boxer Brief</div>
          <div style="font-size:11px;color:#7a736d;margin-top:2px;">Black · Medium · Qty 1</div>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;text-align:right;font-weight:600;font-size:13px;">PKR 1,500</td>
      </tr>
    `,
    storeName: 'HUSHAE',
    customerPhone: '+92 300 1234567',
    customerEmail: to,
    city: 'Lahore',
    paymentMethod: 'COD',
    paymentStatus: 'Pending',
    statusTitle: 'Your order has shipped',
    statusText: 'Your parcel is now on its way. It usually reaches within 2–5 working days.',
    trackingNumber: 'LEO-12345678',
    courierName: 'Leopards Courier',
    discountCode: 'WELCOME10',
    discountPercent: '10',
    expiryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString('en-PK')
  };

  // Helper function to escape
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let replacedSubject = t.subject;
  let replacedBody = t.bodyHTML;

  for (const [k, v] of Object.entries(mockVars)) {
    const unescapedKeys = ['productsList', 'statusText', 'body', 'discountCode'];
    const escapedVal = unescapedKeys.includes(k) ? v : esc(v);
    replacedSubject = replacedSubject.replace(new RegExp(`{${k}}`, 'g'), escapedVal);
    replacedBody = replacedBody.replace(new RegExp(`{${k}}`, 'g'), escapedVal);
  }

  // Base layout wrapping
  const baseLayout = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
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
      Need help? Reply to this email or visit <a href="https://hushae1.vercel.app/track" style="color:#111;">Track your order</a>
    </div>
  </div>
</body></html>`;

  const result = await mailer.sendMail({
    to,
    subject: `[TEST] ${replacedSubject}`,
    html: baseLayout('Test Template', replacedBody)
  });

  res.json({ ok: result.ok !== false, result });
}));

module.exports = router;
