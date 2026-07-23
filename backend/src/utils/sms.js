// SMS sender — pluggable. Right now supports Twilio via env vars.
// Set on Vercel: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (e.g. +1...)
// Returns true if a real SMS was sent, false when running in demo mode.

const isConfigured = () =>
  !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

async function sendSms(toE164, text) {
  if (!isConfigured()) return false;
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

module.exports = { sendSms, isConfigured };
