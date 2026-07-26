// Payment gateway providers — real integration hooks.
// Currently a scaffold that:
//   - Verifies credentials are set (from Settings.integrations.payments.*)
//   - Exposes a common interface: initiate(order, options) -> { redirectUrl, ref }
//                                 verify(ref, signature)  -> { paid, amount, meta }
// This lets the UI + orders flow work today while the merchant applications
// are being approved. Live SDK calls slot in without any frontend change.

/* -------------------- JazzCash -------------------- */
/*
 * JazzCash HPP (Hosted Checkout) merchant setup:
 *   1. Register at https://sandbox.jazzcash.com.pk / https://payments.jazzcash.com.pk
 *   2. Get: MerchantID, Password, IntegritySalt
 *   3. Store them in Admin > Integrations > Payments (never hardcode)
 */
const crypto = require('crypto');

const jazzcash = {
  isConfigured(cfg) { return !!(cfg && cfg.merchantId && cfg.password && cfg.integritySalt); },

  // Build HPP POST payload — real signing per JazzCash spec.
  // Returns { fields, endpoint } — the frontend posts these to open the JazzCash page.
  initiate(order, cfg) {
    if (!this.isConfigured(cfg)) throw new Error('JazzCash is not configured');
    const now = new Date();
    const yyyymmddhhmmss = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const expiry = new Date(now.getTime() + 60 * 60 * 1000);
    const expiryStr = expiry.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const amountPaisa = Math.round(order.total * 100);
    const txnRef = `T${Date.now()}${order.orderNumber.slice(-6)}`;

    const fields = {
      pp_Version: '1.1',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: cfg.merchantId,
      pp_SubMerchantID: '',
      pp_Password: cfg.password,
      pp_BankID: 'TBANK',
      pp_ProductID: 'RETL',
      pp_TxnRefNo: txnRef,
      pp_Amount: String(amountPaisa),
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: yyyymmddhhmmss,
      pp_BillReference: order.orderNumber,
      pp_Description: `Veloura order ${order.orderNumber}`,
      pp_TxnExpiryDateTime: expiryStr,
      pp_ReturnURL: cfg.returnUrl || '',
      pp_SecureHash: '',
      ppmpf_1: order.orderNumber,
    };

    // Signing per JazzCash spec: HMAC-SHA256(integritySalt & concatenated values)
    const sortedKeys = Object.keys(fields).filter((k) => k !== 'pp_SecureHash' && fields[k] !== '').sort();
    const hashString = cfg.integritySalt + '&' + sortedKeys.map((k) => fields[k]).join('&');
    fields.pp_SecureHash = crypto.createHmac('sha256', cfg.integritySalt).update(hashString).digest('hex').toUpperCase();

    const endpoint = cfg.sandbox
      ? 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
      : 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';

    return { fields, endpoint, ref: txnRef };
  },

  // Verify inbound signature on the JazzCash return/callback
  verify(payload, cfg) {
    if (!this.isConfigured(cfg)) return { ok: false, reason: 'not configured' };
    const received = payload.pp_SecureHash || '';
    const clone = { ...payload };
    delete clone.pp_SecureHash;
    const sortedKeys = Object.keys(clone).filter((k) => clone[k] !== '').sort();
    const hashString = cfg.integritySalt + '&' + sortedKeys.map((k) => clone[k]).join('&');
    const expected = crypto.createHmac('sha256', cfg.integritySalt).update(hashString).digest('hex').toUpperCase();
    const ok = expected === received && payload.pp_ResponseCode === '000';
    return {
      ok,
      ref: payload.pp_TxnRefNo,
      amount: payload.pp_Amount ? Number(payload.pp_Amount) / 100 : 0,
      orderNumber: payload.ppmpf_1 || payload.pp_BillReference,
      raw: payload,
    };
  },
};

/* -------------------- SafePay (Visa / Mastercard) -------------------- */
/*
 * SafePay is the leading Pakistani card gateway (Visa/Mastercard).
 * Register: https://getsafepay.com  (Merchant application requires STRN + bank account)
 * Docs: https://docs.getsafepay.com
 *
 * Flow:
 *   1. Server calls POST /order/v1/init with amount+currency → gets a tracker
 *   2. Frontend redirects the customer to
 *      https://{env}.getsafepay.com/embedded/?env={env}&tbt={tracker}&...
 *   3. SafePay hits our webhook + returns customer to returnUrl
 *   4. We verify the tracker via GET /order/v1/{tracker}
 */
const safepay = {
  isConfigured(cfg) { return !!(cfg && cfg.apiKey && cfg.secret); },

  baseUrl(cfg) {
    return cfg.sandbox
      ? 'https://sandbox.api.getsafepay.com'
      : 'https://api.getsafepay.com';
  },

  async initiate(order, cfg) {
    if (!this.isConfigured(cfg)) throw new Error('SafePay is not configured');
    const res = await fetch(`${this.baseUrl(cfg)}/order/v1/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SFPY-MERCHANT-SECRET': cfg.secret,
      },
      body: JSON.stringify({
        client: cfg.apiKey,
        amount: Math.round(order.total * 100),
        currency: 'PKR',
        environment: cfg.sandbox ? 'sandbox' : 'production',
      }),
    });
    if (!res.ok) throw new Error(`SafePay init failed: ${res.status}`);
    const data = await res.json();
    const tracker = data?.data?.token || data?.tracker;
    if (!tracker) throw new Error('SafePay: no tracker returned');
    const env = cfg.sandbox ? 'sandbox' : 'production';
    const redirectUrl = `https://${env}.getsafepay.com/embedded/?env=${env}&tbt=${tracker}&order_id=${encodeURIComponent(order.orderNumber)}&source=custom&redirect_url=${encodeURIComponent(cfg.returnUrl || '')}`;
    return { redirectUrl, ref: tracker };
  },

  async verify(tracker, cfg) {
    if (!this.isConfigured(cfg)) return { ok: false, reason: 'not configured' };
    const res = await fetch(`${this.baseUrl(cfg)}/order/v1/${encodeURIComponent(tracker)}`, {
      headers: { 'X-SFPY-MERCHANT-SECRET': cfg.secret },
    });
    if (!res.ok) return { ok: false, reason: `verify failed: ${res.status}` };
    const data = await res.json();
    const state = data?.data?.state || data?.state;
    const paid = state === 'PAID' || state === 'CAPTURED' || state === 'TRACKER_ENDED';
    return { ok: paid, state, amount: data?.data?.amount ? data.data.amount / 100 : 0, raw: data };
  },
};

module.exports = { jazzcash, safepay };
