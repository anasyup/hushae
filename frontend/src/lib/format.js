export const pkr = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;

export const cn = (...xs) => xs.filter(Boolean).join(' ');

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const snap = (p) => ({
  id: p._id || p.id, slug: p.slug, name: p.name, price: p.price,
  compareAtPrice: p.compareAtPrice || null,
  /* Sale-window flags must survive the snap, or the "is this on sale?" check
     silently fails and cards lose their % off / strike-through. */
  onSale: p.onSale === true, saleStart: p.saleStart || null, saleEnd: p.saleEnd || null,
  image: p.images?.[0]?.url || p.image || '',
  sizes: p.sizes || [], colors: p.colors || [], tier: p.tier || '', badges: p.badges || [],
  /* Fabric / material survives the snap for the card subtitle line. */
  fabric: p.fabric || '', categorySlug: p.categorySlug || '',
});

/** "4m ago" style relative time for the notification feed. */
export const ago = (ts) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
