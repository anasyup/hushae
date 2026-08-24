/* Merchant-facing customer tags are labels, not permissions. */

function normalizeTag(value) {
  const raw = String(value || '')
    .replace(/[\u0000-\u001F<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);
  if (!raw) return '';

  const lower = raw.toLocaleLowerCase('en-US');
  if (lower === 'vip') return 'VIP';
  return lower
    .split(/([\s/-])/)
    .map((part) => (/^[\s/-]$/.test(part) ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join('');
}

function normalizeTags(values, { max = 40 } = {}) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const tag = normalizeTag(value);
    const key = tag.toLocaleLowerCase('en-US');
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

module.exports = { normalizeTag, normalizeTags };
