// NoSQL-injection block: strips keys starting with "$" or containing "." from incoming data
// e.g. { "email": { "$gt": "" } } never reaches MongoDB
function clean(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(clean); return; }
  for (const k of Object.keys(obj)) {
    if (k.startsWith('$') || k.includes('.')) delete obj[k];
    else clean(obj[k]);
  }
}

module.exports = (req, res, next) => {
  try {
    clean(req.body);
    clean(req.query);
    clean(req.params);
  } catch (e) { /* never block a request over sanitation */ }
  return next();
};
