const dns = require('node:dns').promises;

// Normalize a Pakistani mobile to 03XXXXXXXXX (accepts 03xx / +923xx / 923xx / 3xx); null if invalid
const normalizePhone = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  let p = d;
  if (p.startsWith('0092')) p = `0${p.slice(4)}`;
  else if (p.startsWith('92') && p.length === 12) p = `0${p.slice(2)}`;
  else if (p.length === 10 && p.startsWith('3')) p = `0${p}`;
  return /^03\d{9}$/.test(p) ? p : null;
};

const EMAIL_RX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

const validEmail = (email) => EMAIL_RX.test(String(email || '').trim());

// Known-good providers skip DNS; anything else must really exist (anti-scam)
const TRUSTED_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com', 'hotmail.co.uk',
  'outlook.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'protonmail.com', 'proton.me', 'gmx.com', 'gmx.net', 'mail.com', 'yandex.com', 'zoho.com', 'hey.com',
]);

// Returns true only if the domain can actually receive mail (or DNS is temporarily unreachable —
// we never block a real customer over a transient DNS hiccup)
const verifyEmailDomain = async (email) => {
  const domain = String(email).split('@')[1]?.toLowerCase();
  if (!domain) return false;
  if (TRUSTED_DOMAINS.has(domain)) return true;
  const transient = (code) => code === 'EAI_AGAIN' || code === 'ETIMEOUT' || code === 'ECONNREFUSED';
  try {
    const mx = await dns.resolveMx(domain);
    if (mx && mx.length) return true;
  } catch (e) {
    if (transient(e.code)) return true;
    // No MX — RFC 5321 allows A-record fallback
    try {
      const a = await dns.resolve4(domain);
      if (a && a.length) return true;
    } catch (e2) {
      return transient(e2.code);
    }
    return false;
  }
  return true;
};

module.exports = { normalizePhone, validEmail, verifyEmailDomain };
