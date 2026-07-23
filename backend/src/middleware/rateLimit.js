// IP-based brute-force / spam protection (in-memory; per serverless instance — still a solid wall)
const buckets = new Map();

function sweep() {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}
setInterval(() => { if (buckets.size > 5000) sweep(); }, 10 * 60 * 1000).unref?.();

/**
 * rateLimit({ windowMs, max, message, key }) — block after `max` requests within windowMs per IP(+key)
 */
module.exports = function rateLimit({ windowMs, max, message, key } = {}) {
  return (req, res, next) => {
    const k = `${req.ip || 'unknown'}|${key || req.baseUrl + req.path}|${req.method}`;
    const now = Date.now();
    let b = buckets.get(k);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(k, b);
    }
    b.count += 1;
    if (b.count > max) {
      const wait = Math.ceil((b.resetAt - now) / 1000);
      res.set('Retry-After', String(wait));
      return res.status(429).json({ message: message || `Too many attempts — please try again in ${wait} seconds` });
    }
    return next();
  };
};
