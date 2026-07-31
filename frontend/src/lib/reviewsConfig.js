/* ============================================================================
 * REVIEWS CONFIG
 *
 * Same contract as cartConfig / checkoutConfig / accountConfig / cxConfig:
 * these defaults are byte-identical to the `reviews` block in
 * backend/src/models/Settings.js, so the first paint already matches the
 * merchant's saved values and nothing flashes while /settings is in flight.
 * ========================================================================== */

export const REVIEW_DEFAULTS = {
  enabled: true,
  showRatings: true,
  title: 'Reviews',
  emptyText: 'No reviews yet — be the first to share your fit.',

  allowGuest: false,
  verifiedRequired: true,

  autoApprove: false,
  allowEdit: true,
  editWindowHours: 24,
  allowReport: true,
  allowHelpful: true,
  allowMerchantReply: true,

  minLength: 20,
  maxLength: 2000,
  minRating: 1,
  requireTitle: false,

  enablePhotos: true,
  maxPhotos: 5,
  photoMaxMb: 2,
  enableVideos: false,
  maxVideos: 1,
  videoMaxMb: 20,
  showMediaGallery: true,

  showDistribution: true,
  showFeatured: true,
  allowSharing: true,
  perPage: 8,

  enableQA: true,
  qaAutoApprove: false,
  qaAllowGuest: true,
  qaTitle: 'Questions & answers',
  qaEmptyText: 'No questions yet — ask us anything about fit or fabric.',

  notifyOnNewReview: true,
  notifyOnNewQuestion: true,
};

export function reviewsConfig(settings) {
  const r = settings?.reviews || {};
  const out = { ...REVIEW_DEFAULTS };
  for (const k of Object.keys(REVIEW_DEFAULTS)) {
    const v = r[k];
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

/** "3 Aug 2026" — reviews read better with a plain date than a timestamp. */
export const reviewDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
