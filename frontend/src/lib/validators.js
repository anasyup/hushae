// Normalize a Pakistani mobile to 03XXXXXXXXX (accepts 03xx / +923xx / 923xx / 3xx); null if invalid
export function normalizePhone(v) {
  const d = String(v || '').replace(/\D/g, '');
  let p = d;
  if (p.startsWith('0092')) p = `0${p.slice(4)}`;
  else if (p.startsWith('92') && p.length === 12) p = `0${p.slice(2)}`;
  else if (p.length === 10 && p.startsWith('3')) p = `0${p}`;
  return /^03\d{9}$/.test(p) ? p : null;
}

const EMAIL_RX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

export const validEmail = (email) => EMAIL_RX.test(String(email || '').trim());
