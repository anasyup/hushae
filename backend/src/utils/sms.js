// Message sender — pluggable providers, tried in priority order:
//  1) WhatsApp Cloud API (Meta official) — set WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE
//  2) Twilio SMS — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
//  3) Neither configured → "demo" mode (code shown on screen for testing)

const twilioConfigured = () =>
  !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

const whatsappConfigured = () =>
  !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TEMPLATE);

const provider = () => {
  if (whatsappConfigured()) return 'whatsapp';
  if (twilioConfigured()) return 'sms';
  return null; // demo
};

// Meta Cloud API — authentication template (copy-code button).
// `to` must be international digits without "+" (e.g. 923001234567)
async function sendWhatsAppOtp(to, code) {
  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: process.env.WHATSAPP_TEMPLATE,
        language: { code: 'en_US' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`WhatsApp delivery failed (${t.slice(0, 150)})`);
  }
  return true;
}

// Twilio REST API
async function sendSms(toE164, text) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({ To: toE164, From: process.env.TWILIO_FROM, Body: text });
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`SMS provider rejected the message (${t.slice(0, 120)})`);
  }
  return true;
}

// One entry point the OTP route calls — returns the channel used, or null (demo)
async function sendOtpCode(phone03, code) {
  const e164Digits = `92${phone03.slice(1)}`; // 923001234567
  const p = provider();
  if (p === 'whatsapp') {
    await sendWhatsAppOtp(e164Digits, code);
    return 'whatsapp';
  }
  if (p === 'sms') {
    await sendSms(`+${e164Digits}`, `Your VELOURA verification code is ${code}. It expires in 5 minutes.`);
    return 'sms';
  }
  return null;
}

module.exports = { sendSms, sendWhatsAppOtp, sendOtpCode, provider, isConfigured: () => !!provider() };
