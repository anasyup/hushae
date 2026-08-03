/* ============================================================================
 * PROMOTION TYPE REGISTRY
 *
 * One table describing all seven types, so the list, the builder and the
 * calendar agree on what a "bxgy" is called and which fields it needs.
 * Without this each screen invents its own label and they drift — exactly what
 * happened to `Toggle`, which grew into five different implementations across
 * nine admin files before this sprint consolidated it.
 *
 * `fields` drives which parts of the builder are shown. Rendering every option
 * for every type produces a wall of controls nobody reads, and a merchant
 * setting "buy quantity" on a free-shipping promotion is a support ticket.
 * ========================================================================== */

export const PROMO_TYPES = [
  {
    id: 'percent',
    label: 'Percentage off',
    short: '% off',
    help: 'Take a percentage off everything the rule applies to.',
    fields: ['discountPercent', 'maxDiscount', 'scope'],
    example: '15% off all bras',
  },
  {
    id: 'fixed',
    label: 'Fixed amount off',
    short: 'PKR off',
    help: 'Take a set number of rupees off.',
    fields: ['discountFixed', 'scope'],
    example: 'PKR 300 off orders over 2,000',
  },
  {
    id: 'flash',
    label: 'Flash sale',
    short: 'Flash',
    help: 'A percentage off, but only inside a time window. Use the schedule below.',
    fields: ['discountPercent', 'maxDiscount', 'scope', 'schedule', 'recurring'],
    example: '25% off, tonight 8pm to midnight',
  },
  {
    id: 'bxgy',
    label: 'Buy X get Y',
    short: 'BXGY',
    help: 'Buy a number of items and get more free or discounted. The cheapest qualifying item is the one discounted.',
    fields: ['bxgy', 'scope'],
    example: 'Buy 2 vests, get 1 free',
  },
  {
    id: 'bundle',
    label: 'Bundle',
    short: 'Bundle',
    help: 'Set a price for specific products bought together.',
    fields: ['bundle'],
    example: 'Any bra + brief for PKR 2,500',
  },
  {
    id: 'freeship',
    label: 'Free delivery',
    short: 'Free ship',
    help: 'Waive the delivery charge when the conditions are met.',
    fields: [],
    example: 'Free delivery on first orders',
  },
  {
    id: 'tiered',
    label: 'Spend more, save more',
    short: 'Tiered',
    help: 'Bigger discounts at higher basket values. The highest tier reached wins.',
    fields: ['tiers', 'scope'],
    example: 'Spend 3,000 save 10%; spend 6,000 save 20%',
  },
];

export const typeOf = (id) => PROMO_TYPES.find((t) => t.id === id) || PROMO_TYPES[0];
export const typeLabel = (id) => typeOf(id).label;
export const hasField = (typeId, field) => typeOf(typeId).fields.includes(field);

/** Human wording for every reason the engine can refuse a promotion.
 *  The API returns machine codes; a merchant needs a sentence. */
export const REJECT_REASONS = {
  disabled: 'Switched off',
  scheduled: 'Has not started yet',
  ended: 'Finished',
  'limit-reached': 'Hit its usage limit',
  'budget-spent': 'Spent its discount budget',
  'not-today': 'Does not run on this day',
  'outside-hours': 'Outside its daily time window',
  'coupon-active': 'Blocked because a coupon code was used',
  'below-minimum': 'Basket is below the minimum spend',
  'too-few-items': 'Not enough items in the basket',
  'payment-method': 'Wrong payment method',
  city: 'Not available in this city',
  'not-first-order': 'Customer has ordered before',
  'not-returning': 'Customer has never ordered',
  tier: 'Customer is not in the right loyalty tier',
  'not-invited': 'Customer is not on the invited list',
  'no-match': 'Nothing in the basket matches',
  'line-already-discounted': 'Another promotion already discounted those items',
  'exclusive-promotion-active': 'An exclusive promotion is running',
};

export const reasonText = (code) => REJECT_REASONS[code] || code;

/** A blank promotion. Matches the Mongoose schema field for field so the
 *  builder never posts a shape the server has to guess at. */
export const EMPTY_PROMO = {
  name: '',
  publicLabel: '',
  internalNote: '',
  type: 'percent',
  enabled: false,
  startsAt: null,
  endsAt: null,
  recurring: { enabled: false, daysOfWeek: [], startMin: 0, endMin: 1439 },
  discountPercent: 0,
  discountFixed: 0,
  maxDiscount: 0,
  scope: {
    mode: 'all',
    productIds: [], categorySlugs: [], collectionIds: [], tags: [],
    gender: '', tiers: [], badges: [],
    minPrice: null, maxPrice: null,
    excludeProductIds: [], excludeOnSale: false,
  },
  bxgy: { buyQty: 2, getQty: 1, getPercent: 100, maxPerOrder: 1, cheapestFree: true, getScope: { mode: 'all' } },
  bundle: { productIds: [], requireAll: true, minItems: 2, bundlePrice: 0 },
  tiers: [],
  eligibility: {
    audience: 'all', loyaltyTiers: [], phones: [],
    minCartTotal: 0, minCartItems: 0, paymentMethods: [], cities: [],
  },
  limits: { maxUses: 0, maxUsesPerPhone: 0, maxTotalDiscount: 0 },
  priority: 100,
  stackable: false,
  exclusive: false,
  allowWithCoupon: true,
  badge: { text: '', color: '#B3927E', show: true },
  showInCart: true,
  showOnCard: true,
};

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** minutes-from-midnight <-> "HH:MM", for the recurring window controls. */
export const minToTime = (m) => {
  const h = Math.floor((Number(m) || 0) / 60);
  const mm = (Number(m) || 0) % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
export const timeToMin = (t) => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
