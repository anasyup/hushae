const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'store', unique: true },
  storeName: { type: String, default: 'HUSHAE' },
  tagline: { type: String, default: 'Second Skin, First Choice.' },
  contactEmail: { type: String, default: 'care@hushae.pk' },
  contactPhone: { type: String, default: '0319 8459984' },

  // =========================================================================
  // BUSINESS ADDRESS — displayed on invoices, legal pages, and store footer
  // =========================================================================
  businessAddress: {
    legalName:  { type: String, default: '' },
    ntn:        { type: String, default: '' },   // NTN / Tax ID
    street:     { type: String, default: '' },
    city:       { type: String, default: '' },
    province:   { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country:    { type: String, default: 'Pakistan' },
  },

  // =========================================================================
  // CURRENCY — used in order invoices, refunds, and storefront price display
  // NOTE: the default symbol is 'PKR' — byte-identical to the legacy
  // storefront price output ("PKR 1,250"). The moment the merchant edits the
  // symbol (Rs., ₨, $…) the storefront follows via lib/format.js.
  // =========================================================================
  currency: {
    code:             { type: String, default: 'PKR' },
    symbol:           { type: String, default: 'PKR' },
    position:         { type: String, default: 'before' },  // 'before' | 'after'
    decimalSeparator: { type: String, default: '.' },
    thousandSeparator:{ type: String, default: ',' },
  },

  // =========================================================================
  // TIME ZONE — used by marketing schedule display and admin timestamps
  // =========================================================================
  timezone: { type: String, default: 'Asia/Karachi' },

  /* Include admin/staff test orders in analytics. Default OFF — test orders
     would otherwise inflate Revenue, Orders, AOV, Top Customers, etc. */
  includeTestOrders: { type: Boolean, default: false },
  /* Target stock level used by the low-stock "Reorder" suggestion. */
  reorderTargetStock: { type: Number, default: 50 },
  // ==========================================================================
  // HEADER — logo block + fully editable main menu
  // ==========================================================================
  header: {
    // Logo block
    logoType:      { type: String,  default: 'text' },   // text | image
    logoImage:     { type: String,  default: '' },
    logoWidth:     { type: Number,  default: 130 },      // px, image logo only
    logoText:      { type: String,  default: '' },       // blank → falls back to storeName
    logoBoxed:     { type: Boolean, default: true },     // outlined box around the wordmark
    logoTracking:  { type: Number,  default: 32 },       // letter-spacing ×100 (0.32em)
    logoSize:      { type: Number,  default: 26 },       // px on desktop (text logo)
    logoFont:      { type: String,  default: 'display' },// display (serif) | sans
    // Bar layout — edge-to-edge editorial bar by default (Calvin Klein style)
    width:         { type: String,  default: 'full' },   // full | boxed
    height:        { type: Number,  default: 80 },       // px on desktop
    border:        { type: Boolean, default: true },     // hairline under the bar once scrolled
    menuAlign:     { type: String,  default: 'center' }, // center | left
    navSize:       { type: Number,  default: 13 },       // px
    navGap:        { type: Number,  default: 34 },       // px between links
    navUppercase:  { type: Boolean, default: false },    // false → sentence case
    // Main menu — merchant-managed links, each may hold a dropdown
    menu: {
      type: [{
        _id: false,
        label: { type: String, default: '' },
        href:  { type: String, default: '/' },
        // '' = plain link · 'women'/'men' = auto category dropdown
        dropdown: { type: String, default: '' },
        highlight: { type: Boolean, default: false },    // renders in accent colour (e.g. Sale)
      }],
      default: [
        { label: 'Women',        href: '/women',      dropdown: 'women', highlight: false },
        { label: 'Men',          href: '/men',        dropdown: 'men',   highlight: false },
        { label: 'New Arrivals', href: '/new',        dropdown: '',      highlight: false },
        { label: 'Best Sellers', href: '/best',       dropdown: '',      highlight: false },
        { label: 'Sale',         href: '/sale',       dropdown: '',      highlight: true },
        { label: 'Fit Finder',   href: '/fit-finder', dropdown: '',      highlight: false },
        { label: 'Track Order',  href: '/track',      dropdown: '',      highlight: false },
      ],
    },
    // Icon row
    showSearch:   { type: Boolean, default: true },
    showWishlist: { type: Boolean, default: true },
    showAccount:  { type: Boolean, default: true },
    showCart:     { type: Boolean, default: true },
    sticky:       { type: Boolean, default: true },
  },
  // ==========================================================================
  // FOOTER — every column and the bottom bar are editable
  // ==========================================================================
  footer: {
    showNewsletter: { type: Boolean, default: true },
    newsletterTitle:{ type: String,  default: 'Join the inner circle' },
    newsletterText: { type: String,  default: 'Early access to new drops, fit guides and private offers.' },
    aboutText:      { type: String,  default: '' },      // blank → falls back to tagline
    tagline:        { type: String,  default: 'Made in Pakistan · Worn worldwide soon' },
    showSocial:     { type: Boolean, default: true },
    columns: {
      type: [{
        _id: false,
        title: { type: String, default: '' },
        links: { type: [{ _id: false, label: String, href: String }], default: [] },
      }],
      default: [
        { title: 'Shop', links: [
          { label: 'Women', href: '/women' }, { label: 'Men', href: '/men' },
          { label: 'New Arrivals', href: '/new' }, { label: 'Best Sellers', href: '/best' },
          { label: 'Sale', href: '/sale' },
        ] },
        { title: 'Help', links: [
          { label: 'Track Order', href: '/track' }, { label: 'Fit Finder', href: '/fit-finder' },
          { label: 'FAQ', href: '/faq' }, { label: 'My Account', href: '/account' },
          { label: 'Wishlist', href: '/wishlist' },
        ] },
        { title: 'Policies', links: [
          { label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Service', href: '/terms' },
          { label: 'Returns & Exchanges', href: '/returns' }, { label: 'Shipping Policy', href: '/shipping-policy' },
        ] },
      ],
    },
    showContact:   { type: Boolean, default: true },
    contactTitle:  { type: String,  default: 'Contact' },
    contactNote:   { type: String,  default: 'Pakistan — nationwide delivery' },
    paymentNote:   { type: String,  default: 'COD · JazzCash · EasyPaisa · Bank Transfer' },
    bottomText:    { type: String,  default: '' },       // blank → auto "© YEAR HUSHAE · …"
  },
  hero: {
    title: { type: String, default: 'Second Skin,\nFirst Choice.' },
    subtitle: { type: String, default: 'Underwear engineered in breathable, cloud-soft fabrics — designed in Pakistan, finished to an international standard.' },
    // Eyebrow (small text above the title)
    eyebrow: { type: String, default: 'Premium innerwear · Made in Pakistan' },
    ctaWomen: { type: String, default: 'Shop Now' },
    ctaMen: { type: String, default: 'Shop Men' },
    image: { type: String, default: '/images/hero/hushae-hero.jpg' },   // desktop banner image
    video: { type: String, default: '' },            // optional MP4 for full-screen hero
    poster: { type: String, default: '' },           // poster image shown while video loads
    fullScreen: { type: Boolean, default: true },    // international-style full-viewport hero (default ON now)
    align: { type: String, default: 'left' },        // 'left' | 'center'
    overlayOpacity: { type: Number, default: 40 },   // 0-100 — dark overlay strength for text readability
    // Master switch: show CTA buttons or hide them completely
    showButtons: { type: Boolean, default: true },
    // Dropdown-style CTA: a single "Shop" button that opens a menu
    ctaStyle: { type: String, default: 'dropdown', enum: ['buttons', 'dropdown'] },
    shopMenu: {
      type: [{ label: String, href: String, _id: false }],
      default: [
        { label: 'New Arrivals', href: '/new' },
        { label: 'Best Sellers', href: '/best' },
        { label: 'Women',        href: '/women' },
        { label: 'Men',          href: '/men' },
        { label: 'Sale',         href: '/sale' },
      ],
    },
    // Optional small badges shown under CTA
    badges: { type: [String], default: [] },
  },
  // Signature Split Hero — Women (left) + Men (right) editorial block on the home page.
  // Fully admin-editable: images, video, headline, colours, CTA text/links, or disable entirely.
  signatureSplit: {
    enabled:        { type: Boolean, default: true },
    eyebrow:        { type: String,  default: 'The Signature Edit' },
    title:          { type: String,  default: 'Premium,\nperfected.' },
    subtitle:       { type: String,  default: 'Silk-touch fabrics. Bonded seamless edges. Discreet packaging always. The HUSHAE house edit, made for the pieces you\'ll reach for daily.' },
    textColor:      { type: String,  default: '#FFFFFF' },
    textShadow:     { type: Boolean, default: true },
    titleFont:      { type: String,  default: 'display' },   // 'display' | 'sans'
    // Left half — Women
    leftImage:      { type: String,  default: '/images/products/gemini/bra-blush-lace.png' },
    leftVideo:      { type: String,  default: '' },          // optional MP4 (autoplay muted loop)
    leftCtaLabel:   { type: String,  default: 'Shop Women' },
    leftCtaHref:    { type: String,  default: '/women' },
    // Right half — Men
    rightImage:     { type: String,  default: '/images/products/gemini/boxer-white-premium.png' },
    rightVideo:     { type: String,  default: '' },
    rightCtaLabel:  { type: String,  default: 'Shop Men' },
    rightCtaHref:   { type: String,  default: '/men' },
    // Overlay strength (0-100)
    overlayOpacity: { type: Number,  default: 25 },
  },
  // Media library (Cloudinary) — enables PC file uploads across admin
  media: {
    cloudName: { type: String, default: '' },
    uploadPreset: { type: String, default: '' },
  },
  // Scrolling marquee strip under the hero
  marquee: {
    enabled: { type: Boolean, default: true },
    items: {
      type: [String],
      default: ['COD available — nationwide', 'Free shipping over PKR 4,999', '14-day easy exchange', 'Discreet packaging — always', 'Made in Pakistan', '3-tier quality system'],
    },
  },
  // Timed newsletter popup with optional coupon reveal
  promoPopup: {
    enabled: { type: Boolean, default: true },
    delaySec: { type: Number, default: 18 },
    title: { type: String, default: 'Join the HUSHAE inner circle' },
    text: { type: String, default: 'First access to drops, private sales and member-only offers. No spam — ever.' },
    couponCode: { type: String, default: '' },
  },
  trustBadges: [{
    title: String,
    text: String,
    _id: false,
  }],
  shippingFlatRate: { type: Number, default: 350 },
  freeShippingThreshold: { type: Number, default: 4999 },
  // ==========================================================================
  // LOYALTY, REWARDS & RETENTION
  //
  // One block, many modules. Each module has its own `enabled` flag so the
  // merchant can run points without tiers, or tiers without referrals, etc.
  // Nothing in the storefront reads a hardcoded number — every value a
  // customer can see or earn is here.
  // ==========================================================================
  loyalty: {
    enabled:        { type: Boolean, default: false },   // OFF until the merchant sets it up
    programName:    { type: String,  default: 'HUSHAE Circle' },
    pointsName:     { type: String,  default: 'points' },
    pointsNameOne:  { type: String,  default: 'point' },

    // ---- Earning --------------------------------------------------------
    earn: {
      // Points per PKR spent. 0.01 = 1 point per PKR 100.
      perCurrency:      { type: Number,  default: 0.01 },
      roundingMode:     { type: String,  default: 'floor', enum: ['floor', 'round', 'ceil'] },
      // Which order state actually pays out. 'Delivered' is the honest choice:
      // paying on 'Pending' means paying for orders that get cancelled.
      awardOnStatus:    { type: String,  default: 'Delivered' },
      earnOnDiscounted: { type: Boolean, default: true },
      earnOnShipping:   { type: Boolean, default: false },

      signupPoints:     { type: Number,  default: 100 },
      signupEnabled:    { type: Boolean, default: true },
      firstOrderPoints: { type: Number,  default: 200 },
      firstOrderEnabled:{ type: Boolean, default: true },
      reviewPoints:     { type: Number,  default: 50 },
      reviewEnabled:    { type: Boolean, default: true },
      newsletterPoints: { type: Number,  default: 25 },
      newsletterEnabled:{ type: Boolean, default: true },
      profilePoints:    { type: Number,  default: 25 },
      profileEnabled:   { type: Boolean, default: true },
      birthdayPoints:   { type: Number,  default: 250 },
      birthdayEnabled:  { type: Boolean, default: true },
    },

    // ---- Redemption -----------------------------------------------------
    redeem: {
      enabled:        { type: Boolean, default: true },
      // What one point is worth in PKR at checkout.
      pointValue:     { type: Number,  default: 1 },
      minPoints:      { type: Number,  default: 200 },
      // Cap redemption so a basket can never go to zero on points alone.
      maxPercentOfOrder: { type: Number, default: 50 },
      step:           { type: Number,  default: 50 },
    },

    // ---- Expiry ---------------------------------------------------------
    expiry: {
      enabled:    { type: Boolean, default: true },
      months:     { type: Number,  default: 12 },
      warnDays:   { type: Number,  default: 30 },
    },

    // ---- Tiers ----------------------------------------------------------
    tiers: {
      enabled:     { type: Boolean, default: true },
      // Rolling window the qualifying spend is measured over. 0 = lifetime.
      windowMonths:{ type: Number,  default: 12 },
      levels: {
        type: [{
          _id: false,
          id:        { type: String, default: '' },
          name:      { type: String, default: '' },
          minSpend:  { type: Number, default: 0 },
          multiplier:{ type: Number, default: 1 },      // points multiplier
          freeShipping: { type: Boolean, default: false },
          discountPercent: { type: Number, default: 0 },
          colour:    { type: String, default: '#C9BFB4' },
          perks:     { type: [String], default: [] },
        }],
        default: [
          { id: 'bronze',   name: 'Bronze',   minSpend: 0,      multiplier: 1,   freeShipping: false, discountPercent: 0, colour: '#B3927E', perks: ['Earn points on every order'] },
          { id: 'silver',   name: 'Silver',   minSpend: 15000,  multiplier: 1.25, freeShipping: false, discountPercent: 0, colour: '#C9BFB4', perks: ['1.25× points', 'Early access to drops'] },
          { id: 'gold',     name: 'Gold',     minSpend: 40000,  multiplier: 1.5, freeShipping: true,  discountPercent: 5, colour: '#C8A96A', perks: ['1.5× points', 'Free delivery', '5% member discount'] },
          { id: 'platinum', name: 'Platinum', minSpend: 90000,  multiplier: 1.75, freeShipping: true, discountPercent: 8, colour: '#8F9C8B', perks: ['1.75× points', 'Free delivery', '8% member discount', 'Priority support'] },
          { id: 'diamond',  name: 'Diamond',  minSpend: 180000, multiplier: 2,   freeShipping: true,  discountPercent: 12, colour: '#5C6A5A', perks: ['2× points', 'Free delivery', '12% member discount', 'Private previews'] },
        ],
      },
    },

    // ---- Referrals ------------------------------------------------------
    referral: {
      enabled:        { type: Boolean, default: true },
      referrerPoints: { type: Number,  default: 300 },
      refereePoints:  { type: Number,  default: 150 },
      // Referrer is paid only once the friend's order reaches this state,
      // otherwise a self-referral ring can mint points from cancelled orders.
      payOnStatus:    { type: String,  default: 'Delivered' },
      minOrderValue:  { type: Number,  default: 1500 },
      maxPerMonth:    { type: Number,  default: 10 },
      codePrefix:     { type: String,  default: 'HUS' },
    },

    // ---- Store credit & wallet -----------------------------------------
    credit: {
      enabled:      { type: Boolean, default: true },
      allowAtCheckout: { type: Boolean, default: true },
    },

    // ---- Gift cards -----------------------------------------------------
    giftCards: {
      enabled:      { type: Boolean, default: true },
      minAmount:    { type: Number,  default: 500 },
      maxAmount:    { type: Number,  default: 50000 },
      expiryMonths: { type: Number,  default: 12 },
      codePrefix:   { type: String,  default: 'HUSGC' },
    },

    // ---- Achievements ---------------------------------------------------
    achievements: {
      enabled: { type: Boolean, default: true },
      list: {
        type: [{
          _id: false,
          id:     { type: String, default: '' },
          name:   { type: String, default: '' },
          note:   { type: String, default: '' },
          icon:   { type: String, default: 'Award' },
          metric: { type: String, default: 'orders', enum: ['orders', 'spend', 'reviews', 'referrals', 'points'] },
          target: { type: Number, default: 1 },
          points: { type: Number, default: 0 },
        }],
        default: [
          { id: 'first-buy',  name: 'First order',    note: 'Placed your first HUSHAE order',   icon: 'ShoppingBag', metric: 'orders',    target: 1,  points: 0 },
          { id: 'regular',    name: 'Regular',        note: 'Five orders in',                   icon: 'Repeat',      metric: 'orders',    target: 5,  points: 100 },
          { id: 'reviewer',   name: 'Reviewer',       note: 'Wrote three reviews',              icon: 'Star',        metric: 'reviews',   target: 3,  points: 75 },
          { id: 'connector',  name: 'Connector',      note: 'Referred three friends',           icon: 'Users',       metric: 'referrals', target: 3,  points: 150 },
        ],
      },
    },

    // ---- Abuse prevention -----------------------------------------------
    limits: {
      maxPointsPerOrder: { type: Number, default: 5000 },
      maxPointsPerDay:   { type: Number, default: 10000 },
      // Guard against a script hammering an earn endpoint.
      minSecondsBetweenEarns: { type: Number, default: 2 },
      blockSelfReferral: { type: Boolean, default: true },
    },

    // ---- Notifications ---------------------------------------------------
    notify: {
      onEarn:     { type: Boolean, default: true },
      onTierUp:   { type: Boolean, default: true },
      onExpiring: { type: Boolean, default: true },
    },

    // ---- Wording ---------------------------------------------------------
    dashboardTitle: { type: String, default: 'Rewards' },
    joinText:       { type: String, default: 'Earn points on everything you buy, and turn them into money off.' },
  },
  // ==========================================================================
  // REVIEWS, RATINGS & Q&A
  // ==========================================================================
  // ==========================================================================
  // SEARCH, DISCOVERY & RECOMMENDATIONS
  //
  // Measured before this block existed: search matched only name, sku and
  // categorySlug with a plain regex. "black" returned 0 results even though 49
  // products have a black colourway, and a single typo ("coton") returned 0.
  // Every value a shopper's search depends on now lives here.
  // ==========================================================================
  // ==========================================================================
  // CMS & CONTENT
  //
  // Measured before this block existed: /privacy, /terms, /returns and
  // /shipping-policy all render from a hardcoded DOCS object in
  // frontend/src/pages/Legal.jsx. The merchant cannot change a word of their
  // own returns policy without a developer.
  // ==========================================================================
  cms: {
    enabled: { type: Boolean, default: true },

    // Never publish on create — a page that goes live the instant it is saved
    // gives nobody a chance to read it first.
    defaultStatus:   { type: String,  default: 'draft', enum: ['draft', 'published'] },
    requireSeoTitle: { type: Boolean, default: false },
    // Renaming a slug silently breaks every existing link. On by default.
    autoRedirectOnRename: { type: Boolean, default: true },
    maxVersions:     { type: Number,  default: 30 },

    slug: {
      lowercase: { type: Boolean, default: true },
      maxLength: { type: Number,  default: 80 },
      // Addresses that would shadow a real route. Serving a CMS page at /cart
      // would break the shop in a way that looks like a caching bug.
      reserved: {
        type: [String],
        default: [
          'admin', 'api', 'cart', 'checkout', 'account', 'shop', 'search', 'product',
          'category', 'collection', 'wishlist', 'compare', 'rewards', 'track',
          'order', 'sale', 'new', 'best', 'men', 'women', 'fit-finder',
          'reset-password', 'verify-email', '__theme-preview',
        ],
      },
    },

    seo: {
      titleTemplate:      { type: String,  default: '%s · HUSHAE' },
      defaultDescription: { type: String,  default: '' },
      defaultOgImage:     { type: String,  default: '' },
      twitterHandle:      { type: String,  default: '' },
      defaultNoIndex:     { type: Boolean, default: false },
    },

    structuredData: {
      enabled:      { type: Boolean, default: true },
      organisation: { type: Boolean, default: true },
      breadcrumbs:  { type: Boolean, default: true },
    },
  },

  // ==========================================================================
  // MARKETING & PROMOTIONS
  //
  // Measured before this block existed:
  //   · 101 of 101 products carry a compareAtPrice — every item is already
  //     marked down, median 22%
  //   · a coupon stacks on that with no cap, then loyalty points (50% cap),
  //     then store credit and gift cards, both uncapped
  //   · no stacking guard existed anywhere in the codebase
  // A PKR 1,550 item could therefore reach checkout at PKR 540 without anyone
  // deciding that. maxTotalDiscountPercent below is the floor that was missing.
  //
  // Everything ships OFF. Turning the block on changes nothing until the
  // merchant also creates a promotion.
  // ==========================================================================
  marketing: {
    enabled: { type: Boolean, default: false },

    // ---- The safety net --------------------------------------------------
    // Cap on the SUM of every promotion on one order, as a percentage of the
    // goods subtotal. Coupons, points and credit have their own separate
    // limits; this bounds what the promotion engine can give away.
    maxTotalDiscountPercent: { type: Number, default: 40 },
    // Refuse to sell a line below this margin over cost. 0 = not enforced.
    minMarginPercent: { type: Number, default: 0 },
    allowWithCoupon: { type: Boolean, default: true },
    // Two promotions on the SAME line. Off means one discount per line.
    allowStacking:   { type: Boolean, default: false },

    // ---- Flash sales -----------------------------------------------------
    flash: {
      enabled:           { type: Boolean, default: false },
      showCountdown:     { type: Boolean, default: true },
      countdownLabel:    { type: String,  default: 'Ends in' },
      urgencyMinutes:    { type: Number,  default: 60 },
      showStockLeft:     { type: Boolean, default: true },
      lowStockThreshold: { type: Number,  default: 5 },
    },

    // ---- Automatic product badges ---------------------------------------
    badges: {
      enabled:      { type: Boolean, default: false },
      newDays:      { type: Number,  default: 21 },
      showNew:      { type: Boolean, default: true },
      showSale:     { type: Boolean, default: true },
      // Without a floor the Sale badge appears on all 101 products and stops
      // meaning anything. 25% puts it on the genuinely sharp cuts only.
      minSalePercent: { type: Number, default: 25 },
      showTrending: { type: Boolean, default: true },
      trendingDays: { type: Number,  default: 7 },
      trendingMinOrders: { type: Number, default: 3 },
      showBestSeller:    { type: Boolean, default: true },
      showLimitedStock:  { type: Boolean, default: true },
      limitedStockThreshold: { type: Number, default: 5 },
      maxPerCard:   { type: Number,  default: 2 },
    },

    // ---- Cart upsells ----------------------------------------------------
    upsell: {
      enabled:       { type: Boolean, default: false },
      title:         { type: String,  default: 'Add to your order' },
      count:         { type: Number,  default: 4 },
      // Suggest only what costs less than the basket average; an upsell
      // dearer than the bag reads as a hard sell.
      maxPriceRatio: { type: Number,  default: 0.8 },
      source:        { type: String,  default: 'auto', enum: ['auto', 'manual', 'bought-together'] },
      manualProductIds: { type: [String], default: [] },
    },
    crossSell: {
      enabled:       { type: Boolean, default: false },
      title:         { type: String,  default: 'Goes well with' },
      count:         { type: Number,  default: 4 },
      onProductPage: { type: Boolean, default: true },
      onCart:        { type: Boolean, default: true },
    },
    boughtTogether: {
      enabled:     { type: Boolean, default: false },
      title:       { type: String,  default: 'Frequently bought together' },
      count:       { type: Number,  default: 3 },
      windowDays:  { type: Number,  default: 180 },
      minCoOccur:  { type: Number,  default: 2 },
      bundleDiscountPercent: { type: Number, default: 0 },
    },

    // ---- Scheduling ------------------------------------------------------
    schedule: {
      timezone:       { type: String,  default: 'Asia/Karachi' },
      // Serverless has no dependable cron, so a promotion's window is judged
      // every time it is read. This flag lets the admin screen say so.
      evaluateOnRead: { type: Boolean, default: true },
    },
  },

  search: {
    enabled:        { type: Boolean, default: true },
    placeholder:    { type: String,  default: 'Search bras, trunks, vests…' },
    minChars:       { type: Number,  default: 2 },
    debounceMs:     { type: Number,  default: 220 },
    perPage:        { type: Number,  default: 24 },

    // ---- Which fields are searched, and how much each one counts ---------
    // A name match must outrank a description match, or searching "cotton"
    // buries the product actually called Cotton Brief under everything whose
    // description mentions cotton.
    fields: {
      name:        { type: Boolean, default: true },
      sku:         { type: Boolean, default: true },
      category:    { type: Boolean, default: true },
      tags:        { type: Boolean, default: true },
      colors:      { type: Boolean, default: true },
      sizes:       { type: Boolean, default: false },
      fabric:      { type: Boolean, default: true },
      badges:      { type: Boolean, default: true },
      description: { type: Boolean, default: true },
    },
    weights: {
      name:        { type: Number, default: 100 },
      sku:         { type: Number, default: 90 },
      category:    { type: Number, default: 40 },
      tags:        { type: Number, default: 35 },
      colors:      { type: Number, default: 30 },
      sizes:       { type: Number, default: 20 },
      fabric:      { type: Number, default: 25 },
      badges:      { type: Number, default: 20 },
      description: { type: Number, default: 10 },
      exactBonus:  { type: Number, default: 60 },   // whole-word hit
      prefixBonus: { type: Number, default: 30 },   // term starts the field
      inStockBonus:{ type: Number, default: 15 },
      featuredBonus:{ type: Number, default: 10 },
      ratingWeight:{ type: Number, default: 4 },    // × ratingAvg
    },

    // ---- Typo tolerance --------------------------------------------------
    // Only applied when a strict search finds nothing: running fuzzy on every
    // query makes "bra" match "bran" and dilutes good results.
    fuzzy: {
      enabled:     { type: Boolean, default: true },
      minTermLen:  { type: Number,  default: 4 },   // never fuzzy "bra"
      maxDistance: { type: Number,  default: 2 },   // Levenshtein
      penalty:     { type: Number,  default: 25 },  // score docked per edit
    },

    // ---- Suggestions -----------------------------------------------------
    suggest: {
      enabled:        { type: Boolean, default: true },
      maxProducts:    { type: Number,  default: 6 },
      maxCategories:  { type: Number,  default: 4 },
      maxTerms:       { type: Number,  default: 4 },
      showImages:     { type: Boolean, default: true },
      showPrices:     { type: Boolean, default: true },
      highlightMatch: { type: Boolean, default: true },
    },

    // ---- History & trending ---------------------------------------------
    history: {
      enabled:  { type: Boolean, default: true },
      maxItems: { type: Number,  default: 8 },
    },
    trending: {
      enabled:    { type: Boolean, default: true },
      windowDays: { type: Number,  default: 14 },
      maxItems:   { type: Number,  default: 6 },
      minCount:   { type: Number,  default: 2 },    // below this it is noise
      manual:     { type: [String], default: [] },  // merchant-pinned terms
    },

    // ---- Merchant-managed vocabulary ------------------------------------
    // Two-way by default: "panty" finds "brief" and the reverse.
    synonyms: {
      type: [{
        _id: false,
        from: { type: String, default: '' },
        to:   { type: String, default: '' },
        both: { type: Boolean, default: true },
      }],
      default: [
        { from: 'panty', to: 'brief', both: true },
        { from: 'panties', to: 'brief', both: true },
        { from: 'underwear', to: 'brief', both: true },
        { from: 'boxer', to: 'trunk', both: true },
        { from: 'banyan', to: 'vest', both: true },
        { from: 'baniyan', to: 'vest', both: true },
        { from: 'sando', to: 'vest', both: true },
        { from: 'nighty', to: 'nightdress', both: true },
        { from: 'night suit', to: 'pyjama', both: true },
        { from: 'pajama', to: 'pyjama', both: true },
        { from: 'brassiere', to: 'bra', both: true },
        { from: 'shalwar', to: 'lounge', both: false },
      ],
    },
    stopWords: {
      type: [String],
      default: ['the', 'a', 'an', 'for', 'and', 'or', 'of', 'with', 'in', 'on', 'to', 'my', 'me', 'ka', 'ki', 'ke', 'wala', 'wali'],
    },
    // Terms the merchant never wants to serve results for.
    blockedTerms: { type: [String], default: [] },

    // ---- Zero-result recovery -------------------------------------------
    noResults: {
      showSuggestions: { type: Boolean, default: true },
      showTrending:    { type: Boolean, default: true },
      showPopular:     { type: Boolean, default: true },
      message:         { type: String,  default: 'No matches for that. Try one of these instead.' },
    },

    // ---- Analytics -------------------------------------------------------
    analytics: {
      enabled:     { type: Boolean, default: true },
      logQueries:  { type: Boolean, default: true },
      logClicks:   { type: Boolean, default: true },
      retainDays:  { type: Number,  default: 180 },
      minLogLen:   { type: Number,  default: 2 },
    },

    // ---- Voice: architecture only, off until the merchant enables it -----
    voice: {
      enabled: { type: Boolean, default: false },
      lang:    { type: String,  default: 'en-PK' },
    },
  },

  // ==========================================================================
  // DISCOVERY — recommendations and the shopping assistant
  // ==========================================================================
  discovery: {
    enabled: { type: Boolean, default: true },

    similar: {
      enabled:      { type: Boolean, default: true },
      title:        { type: String,  default: 'You may also like' },
      count:        { type: Number,  default: 8 },
      sameCategory: { type: Number,  default: 50 },   // scoring weights
      sameGender:   { type: Number,  default: 30 },
      sameTier:     { type: Number,  default: 15 },
      sharedTag:    { type: Number,  default: 10 },
      sharedColor:  { type: Number,  default: 8 },
      priceBandPct: { type: Number,  default: 35 },   // ± band counted as close
      priceBonus:   { type: Number,  default: 12 },
    },
    boughtTogether: {
      enabled: { type: Boolean, default: true },
      title:   { type: String,  default: 'Often bought together' },
      count:   { type: Number,  default: 4 },
      windowDays: { type: Number, default: 180 },
      minCoOccur: { type: Number, default: 2 },
    },
    popular: {
      enabled:    { type: Boolean, default: true },
      title:      { type: String,  default: 'Popular right now' },
      count:      { type: Number,  default: 8 },
      windowDays: { type: Number,  default: 30 },
    },
    personalized: {
      enabled: { type: Boolean, default: true },
      title:   { type: String,  default: 'Picked for you' },
      count:   { type: Number,  default: 8 },
      useRecentlyViewed: { type: Boolean, default: true },
      useOrderHistory:   { type: Boolean, default: true },
    },

    // ---- Shopping assistant ---------------------------------------------
    // Rule-based and server-side. No third-party AI service is called, so no
    // customer data leaves the store and there is no per-query cost.
    assistant: {
      enabled:     { type: Boolean, default: true },
      title:       { type: String,  default: 'Shopping assistant' },
      intro:       { type: String,  default: 'Tell me what you need and I will find it.' },
      buttonLabel: { type: String,  default: 'Help me choose' },
      showOnShop:  { type: Boolean, default: true },
      showOnHome:  { type: Boolean, default: false },
      maxResults:  { type: Number,  default: 6 },
      // The opening chips. Each is a ready-made query the assistant answers.
      prompts: {
        type: [{
          _id: false,
          id:    { type: String, default: '' },
          label: { type: String, default: '' },
          query: { type: String, default: '' },
        }],
        default: [
          { id: 'budget', label: 'Under PKR 1,500', query: 'budget under 1500' },
          { id: 'gift',   label: 'A gift',          query: 'gift' },
          { id: 'summer', label: 'For summer',      query: 'summer breathable' },
          { id: 'daily',  label: 'Everyday basics', query: 'everyday cotton basics' },
          { id: 'bridal', label: 'Bridal / wedding', query: 'bridal wedding' },
        ],
      },
      // Occasion → tags/terms the assistant expands to. Fully editable.
      occasions: {
        type: [{
          _id: false,
          id:     { type: String, default: '' },
          label:  { type: String, default: '' },
          terms:  { type: [String], default: [] },
          gender: { type: String, default: '' },
        }],
        default: [
          { id: 'summer',  label: 'Summer',        terms: ['cooling', 'breathable', 'cotton', 'mesh'], gender: '' },
          { id: 'winter',  label: 'Winter',        terms: ['thermal', 'warm', 'full sleeve'], gender: '' },
          { id: 'bridal',  label: 'Bridal',        terms: ['premium', 'silk-touch', 'lace', 'shapewear'], gender: 'women' },
          { id: 'sports',  label: 'Sports & gym',  terms: ['sports', 'quick dry', 'sweat control', 'active'], gender: '' },
          { id: 'office',  label: 'Office',        terms: ['seamless', 'smooth', 'no-show'], gender: '' },
          { id: 'sleep',   label: 'Sleep & lounge', terms: ['sleepwear', 'loungewear', 'soft'], gender: '' },
          { id: 'gift',    label: 'Gifting',       terms: ['gift', 'premium', 'set', 'pack'], gender: '' },
        ],
      },
      // Budget bands offered as chips. PKR.
      budgets: {
        type: [{ _id: false, id: String, label: String, min: Number, max: Number }],
        default: [
          { id: 'b1', label: 'Under 1,000', min: 0, max: 1000 },
          { id: 'b2', label: '1,000 – 2,000', min: 1000, max: 2000 },
          { id: 'b3', label: '2,000 – 4,000', min: 2000, max: 4000 },
          { id: 'b4', label: '4,000+', min: 4000, max: 0 },
        ],
      },
    },
  },

  reviews: {
    // -- General ----------------------------------------------------------
    enabled:            { type: Boolean, default: true },
    showRatings:        { type: Boolean, default: true },
    title:              { type: String,  default: 'Reviews' },
    emptyText:          { type: String,  default: 'No reviews yet — be the first to share your fit.' },
    // -- Who may write -----------------------------------------------------
    // Merchant chose verified-only: the writer must supply an order number and
    // phone that genuinely match a delivered order containing this product.
    allowGuest:         { type: Boolean, default: false },
    verifiedRequired:   { type: Boolean, default: true },
    // -- Moderation --------------------------------------------------------
    autoApprove:        { type: Boolean, default: false },
    allowEdit:          { type: Boolean, default: true },
    editWindowHours:    { type: Number,  default: 24 },
    allowReport:        { type: Boolean, default: true },
    allowHelpful:       { type: Boolean, default: true },
    allowMerchantReply: { type: Boolean, default: true },
    // -- Content rules -----------------------------------------------------
    minLength:          { type: Number,  default: 20 },
    maxLength:          { type: Number,  default: 2000 },
    minRating:          { type: Number,  default: 1 },
    requireTitle:       { type: Boolean, default: false },
    // -- Media -------------------------------------------------------------
    enablePhotos:       { type: Boolean, default: true },
    maxPhotos:          { type: Number,  default: 5 },
    photoMaxMb:         { type: Number,  default: 2 },
    // Videos are built but OFF: each one would live in the same database as
    // the catalogue, and the 7.5 MB hero video already dominates the payload.
    enableVideos:       { type: Boolean, default: false },
    maxVideos:          { type: Number,  default: 1 },
    videoMaxMb:         { type: Number,  default: 20 },
    showMediaGallery:   { type: Boolean, default: true },
    // -- Display -----------------------------------------------------------
    showDistribution:   { type: Boolean, default: true },
    showFeatured:       { type: Boolean, default: true },
    allowSharing:       { type: Boolean, default: true },
    perPage:            { type: Number,  default: 8 },
    // -- Questions & answers ----------------------------------------------
    enableQA:           { type: Boolean, default: true },
    qaAutoApprove:      { type: Boolean, default: false },
    qaAllowGuest:       { type: Boolean, default: true },
    qaTitle:            { type: String,  default: 'Questions & answers' },
    qaEmptyText:        { type: String,  default: 'No questions yet — ask us anything about fit or fabric.' },
    // -- Notifications -----------------------------------------------------
    notifyOnNewReview:  { type: Boolean, default: true },
    notifyOnNewQuestion:{ type: Boolean, default: true },
  },
  // ==========================================================================
  // CUSTOMER EXPERIENCE — wishlist, recently viewed and product compare.
  // Three small features that all live on the product card, so they share one
  // settings block and one API read.
  // ==========================================================================
  customerExperience: {
    wishlist: {
      enabled:      { type: Boolean, default: true },
      allowGuest:   { type: Boolean, default: true },
      maxItems:     { type: Number,  default: 50 },
      allowShare:   { type: Boolean, default: true },
      allowMoveToCart: { type: Boolean, default: true },
      allowClearAll:   { type: Boolean, default: true },
      title:        { type: String,  default: 'Wishlist' },
      emptyText:    { type: String,  default: 'Tap the heart on any piece to keep it here for later.' },
    },
    recentlyViewed: {
      enabled:      { type: Boolean, default: true },
      maxItems:     { type: Number,  default: 12 },
      expiryDays:   { type: Number,  default: 30 },
      // Default OFF: the merchant explicitly had this row removed from the
      // home page in an earlier sprint. The switch exists so it can come back
      // without a deploy, but shipping it on would undo their decision.
      showOnHome:   { type: Boolean, default: false },
      showOnProduct:{ type: Boolean, default: true },
      title:        { type: String,  default: 'Recently viewed' },
    },
    compare: {
      enabled:      { type: Boolean, default: true },
      maxItems:     { type: Number,  default: 4 },
      showOnCard:   { type: Boolean, default: true },
      highlightDifferences: { type: Boolean, default: true },
      title:        { type: String,  default: 'Compare' },
    },
  },
  // ==========================================================================
  // CUSTOMER ACCOUNTS — who may register, what the account area shows, and
  // the password policy. The storefront reads ONLY from here, so a merchant
  // can tighten or relax the whole account system without a deploy.
  // ==========================================================================
  account: {
    // -- Access ------------------------------------------------------------
    registrationEnabled: { type: Boolean, default: true },
    // Master switch for anything that needs to SEND AN EMAIL. Off until an
    // SMTP/provider is connected — otherwise "reset link sent" would be a lie.
    emailFeatures:       { type: Boolean, default: false },
    emailVerifyRequired: { type: Boolean, default: false },
    // -- Password policy (enforced on BOTH sides; the server is authoritative)
    passwordMinLength:   { type: Number,  default: 8 },
    passwordRequireLetter:{ type: Boolean, default: true },
    passwordRequireNumber:{ type: Boolean, default: false },
    passwordRequireSymbol:{ type: Boolean, default: false },
    // -- Session -----------------------------------------------------------
    rememberMeDays:      { type: Number,  default: 30 },
    sessionDays:         { type: Number,  default: 2 },
    // -- Profile -----------------------------------------------------------
    avatarEnabled:       { type: Boolean, default: true },
    phoneRequired:       { type: Boolean, default: true },
    maxAddresses:        { type: Number,  default: 5 },
    allowDeleteAccount:  { type: Boolean, default: true },
    // -- Account area features (Part 2 reads these too) --------------------
    showWishlist:        { type: Boolean, default: true },
    showRecentlyViewed:  { type: Boolean, default: true },
    showSessions:        { type: Boolean, default: true },
    showNotifications:   { type: Boolean, default: true },
    allowReorder:        { type: Boolean, default: true },
    allowCancelRequest:  { type: Boolean, default: true },
    allowReturnRequest:  { type: Boolean, default: true },
    allowInvoice:        { type: Boolean, default: true },
    // -- Wording -----------------------------------------------------------
    signInTitle:         { type: String,  default: 'Your account' },
    signInSubtitle:      { type: String,  default: 'Sign in for order history, saved addresses and faster checkout.' },
    welcomeGreeting:     { type: String,  default: 'Welcome back' },
    guestNote:           { type: String,  default: 'Accounts are optional — guest checkout always works.' },
  },
  // ==========================================================================
  // CHECKOUT — wording, the payment method registry, the shipping method
  // registry, and every legal/marketing toggle on the way to Order Success.
  //
  // Payment and shipping methods are ARRAYS, not booleans, so the merchant can
  // add a provider later without a schema change. `paymentMethods` above stays
  // for backwards compatibility (Checkout falls back to it when this list is
  // empty) — nothing that already works is allowed to break.
  // ==========================================================================
  checkout: {
    // Set to true the first time a human saves the new Checkout admin page.
    // Until then the legacy settings.paymentMethods booleans are the
    // merchant's real intent and override the paymentList defaults, because
    // Mongoose writes those defaults automatically on the next save.
    checkoutMigrated: { type: Boolean, default: false },
    title:        { type: String, default: 'Checkout' },
    subtitle:     { type: String, default: 'Secure checkout · discreet, unmarked packaging on every order' },
    // -- Who may check out ------------------------------------------------
    guestCheckout:   { type: Boolean, default: true },
    accountRequired: { type: Boolean, default: false },
    rememberCustomer:{ type: Boolean, default: true },
    // -- Sections ----------------------------------------------------------
    showOrderNotes:  { type: Boolean, default: true },
    orderNotesLabel: { type: String,  default: 'Order notes (optional)' },
    orderNotesHint:  { type: String,  default: 'Rider instructions, landmarks…' },
    showBillingAddress: { type: Boolean, default: true },
    showPinLocation: { type: Boolean, default: true },
    // -- Legal / marketing -------------------------------------------------
    termsRequired:   { type: Boolean, default: false },
    termsText:       { type: String,  default: 'I agree to the Terms of Service and Returns Policy' },
    privacyText:     { type: String,  default: 'Your details are used only to deliver this order. We never sell your data.' },
    showNewsletter:  { type: Boolean, default: true },
    newsletterText:  { type: String,  default: 'Email me about new drops and private offers' },
    // -- Trust -------------------------------------------------------------
    showTrust:       { type: Boolean, default: true },
    trust: {
      type: [{ _id: false, icon: { type: String, default: 'ShieldCheck' }, label: { type: String, default: '' } }],
      default: [
        { icon: 'Lock',        label: 'Secure, encrypted checkout' },
        { icon: 'RefreshCw',   label: 'Easy 7-day exchanges' },
        { icon: 'Package',     label: 'Discreet, unmarked parcel' },
        { icon: 'Headphones',  label: 'WhatsApp support, 7 days a week' },
      ],
    },
    // -- Payment registry ---------------------------------------------------
    paymentList: {
      type: [{
        _id: false,
        id:      { type: String, default: '' },       // must match Order.paymentMethod enum
        label:   { type: String, default: '' },
        note:    { type: String, default: '' },
        icon:    { type: String, default: 'CreditCard' },
        enabled: { type: Boolean, default: false },
        needsTxn:{ type: Boolean, default: false },   // show the reference field
        instructions: { type: String, default: '' },  // shown when selected
        comingSoon:   { type: Boolean, default: false },
      }],
      default: [
        { id: 'COD',           label: 'Cash on Delivery', note: 'Pay the rider at your door', icon: 'Banknote',   enabled: true,  needsTxn: false, instructions: '', comingSoon: false },
        { id: 'JazzCash',      label: 'JazzCash',         note: 'Send, then enter the transaction ID', icon: 'Smartphone', enabled: true, needsTxn: true, instructions: '', comingSoon: false },
        { id: 'EasyPaisa',     label: 'EasyPaisa',        note: 'Send, then enter the transaction ID', icon: 'Smartphone', enabled: true, needsTxn: true, instructions: '', comingSoon: false },
        { id: 'Bank Transfer', label: 'Bank Transfer',    note: 'Transfer, then enter the reference',  icon: 'Landmark',   enabled: true, needsTxn: true, instructions: '', comingSoon: false },
      ],
    },
    // -- Shipping registry --------------------------------------------------
    shippingMethods: {
      type: [{
        _id: false,
        id:      { type: String, default: '' },
        label:   { type: String, default: '' },
        note:    { type: String, default: '' },
        rate:    { type: Number, default: 0 },        // 0 = use the global flat rate
        minDays: { type: Number, default: 2 },
        maxDays: { type: Number, default: 5 },
        enabled: { type: Boolean, default: false },
        freeEligible: { type: Boolean, default: true }, // may the free-shipping threshold zero this?
      }],
      default: [
        { id: 'standard', label: 'Standard delivery', note: 'Nationwide courier',        rate: 0,   minDays: 2, maxDays: 5, enabled: true,  freeEligible: true },
        { id: 'express',  label: 'Express delivery',  note: 'Next working day in major cities', rate: 600, minDays: 1, maxDays: 2, enabled: false, freeEligible: false },
        { id: 'pickup',   label: 'Store pickup',      note: 'Collect from our outlet',   rate: 0,   minDays: 1, maxDays: 2, enabled: false, freeEligible: true },
        { id: 'local',    label: 'Local delivery',    note: 'Same-day inside the city',  rate: 250, minDays: 0, maxDays: 1, enabled: false, freeEligible: false },
      ],
    },
    // -- Order success ------------------------------------------------------
    successTitle:    { type: String,  default: 'Thank you — your order is confirmed' },
    successText:     { type: String,  default: 'We are preparing your parcel now. Keep your order number safe — you will need it to track delivery.' },
    successNote:     { type: String,  default: '' },
    showSuccessRecommend: { type: Boolean, default: false },
    showSuccessShare:     { type: Boolean, default: false },
    successShareText:     { type: String,  default: 'I just ordered from HUSHAE' },
    animations:      { type: Boolean, default: true },
  },
  // ==========================================================================
  // CART / SHOPPING BAG — every string, toggle and number the bag renders.
  // The bag reads ONLY from here, so a merchant can restyle the whole
  // experience without a developer. Money rules (flat rate / free-shipping
  // threshold) deliberately stay above so cart and checkout can never disagree.
  // ==========================================================================
  cart: {
    // -- Wording --------------------------------------------------------
    title:            { type: String, default: 'Shopping Bag' },
    emptyTitle:       { type: String, default: 'Your bag is empty' },
    emptyText:        { type: String, default: 'Beautiful foundations are waiting. Start with the pieces everyone is reaching for.' },
    continueLabel:    { type: String, default: 'Continue shopping' },
    continueHref:     { type: String, default: '/women' },
    checkoutLabel:    { type: String, default: 'Proceed to checkout' },
    // -- Delivery promise ------------------------------------------------
    showDelivery:     { type: Boolean, default: true },
    deliveryMinDays:  { type: Number,  default: 2 },
    deliveryMaxDays:  { type: Number,  default: 5 },
    deliveryNote:     { type: String,  default: 'Discreet, unmarked packaging on every order' },
    // -- Free-shipping progress -----------------------------------------
    showProgress:     { type: Boolean, default: true },
    progressAway:     { type: String,  default: 'You are {amount} away from free shipping' },
    progressDone:     { type: String,  default: 'Free shipping unlocked' },
    confetti:         { type: Boolean, default: true },
    // -- Behaviour --------------------------------------------------------
    couponEnabled:    { type: Boolean, default: true },
    saveForLater:     { type: Boolean, default: true },
    undoSeconds:      { type: Number,  default: 5 },
    maxQty:           { type: Number,  default: 10 },
    recommendEnabled: { type: Boolean, default: true },
    recommendTitle:   { type: String,  default: 'Complete the set' },
    recommendStrategy:{ type: String,  default: 'auto', enum: ['auto', 'category', 'recent', 'bestsellers'] },
    // -- Express payment placeholders -----------------------------------
    applePay:         { type: Boolean, default: false },
    googlePay:        { type: Boolean, default: false },
    // -- Tax (0 = prices already include tax; nothing is shown) ----------
    taxPercent:       { type: Number,  default: 0 },
    taxLabel:         { type: String,  default: 'Estimated tax' },
    // -- Trust row --------------------------------------------------------
    showTrust:        { type: Boolean, default: true },
    trust: {
      type: [{ _id: false, icon: { type: String, default: 'ShieldCheck' }, label: { type: String, default: '' } }],
      default: [
        { icon: 'ShieldCheck', label: 'Secure checkout' },
        { icon: 'RefreshCw',   label: 'Easy 7-day returns' },
        { icon: 'BadgeCheck',  label: '100% original products' },
        { icon: 'Lock',        label: 'Encrypted payment' },
      ],
    },
  },
  // Admin-controlled offer strip shown at the very top of every page
  offerBar: {
    enabled: { type: Boolean, default: true },
    messageEn: { type: String, default: 'Season Sale — up to 40% off · while stock lasts' },
    messageUr: { type: String, default: 'سیزن سیل — ۴۰٪ تک رعایت · اسٹاک محدود ہے' },
    ctaEn: { type: String, default: 'Shop the Sale' },
    ctaUr: { type: String, default: 'سیل دیکھیں' },
    link: { type: String, default: '/sale' },
  },
  paymentMethods: {
    cod: { type: Boolean, default: true },
    jazzcash: { type: Boolean, default: true },
    easypaisa: { type: Boolean, default: true },
    bank: { type: Boolean, default: true },
    bankDetails: { type: String, default: 'Bank: Meezan Bank\nTitle: Hushae (Pvt) Ltd\nIBAN: PK00 MEZN 0000 0000 0000 0000' },
  },
  // Cookie consent popup shown to first-time visitors
  cookiePopup: {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: 'Cookies on HUSHAE' },
    text: { type: String, default: 'We use cookies to keep you signed in and remember your bag. With your permission, we also use a few cookies to understand traffic and improve the store. Your data is never sold — promise.' },
  },
  theme: {
    accent: { type: String, default: '#0D0D0D' },
  },
  // Storefront password gate (like Shopify's password page) — empty password = lock can't be enabled
  storefrontLock: {
    enabled: { type: Boolean, default: false },
    password: { type: String, default: '' },
    heading: { type: String, default: 'HUSHAE is opening soon' },
    message: { type: String, default: 'Hum jald launch kar rahay hain. Enter password to preview the store.' },
  },
  integrations: {
    whatsapp: {
      enabled: { type: Boolean, default: false },
      number: { type: String, default: '' },
      message: { type: String, default: 'Hi! I have a question about HUSHAE.' },
      adminAlertNumber: { type: String, default: '' }, // your WhatsApp — receives new-order alerts
      webhookUrl: { type: String, default: '' },       // optional: bridge to Business API (Make/n8n)
    },
    social: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      tiktok: { type: String, default: '' },
    },
    // SMTP email config — read by utils/mailer.js at send time
    email: {
      host:   { type: String, default: '' },
      port:   { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user:   { type: String, default: '' },
      pass:   { type: String, default: '' },
      from:   { type: String, default: '' },
      adminAlert: { type: String, default: '' },
    },
    // Real payment gateway credentials (JazzCash + SafePay for Visa/Mastercard)
    payments: {
      jazzcash: {
        merchantId:    { type: String, default: '' },
        password:      { type: String, default: '' },
        integritySalt: { type: String, default: '' },
        sandbox:       { type: Boolean, default: true },
      },
      safepay: {
        apiKey:  { type: String, default: '' },
        secret:  { type: String, default: '' },
        sandbox: { type: Boolean, default: true },
      },
    },
    analytics: {
      gaId: { type: String, default: '' },
      gtmId: { type: String, default: '' },
      clarityId: { type: String, default: '' },
      metaPixelId: { type: String, default: '' },
      tiktokPixelId: { type: String, default: '' },
    },
    loyalty: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 2 },        // orders required
      discountPercent: { type: Number, default: 10 },
      validDays: { type: Number, default: 60 },
    },
  },
  // Public FAQ page — admin-editable via Content page
  faq: {
    enabled: { type: Boolean, default: true },
    heading: { type: String, default: 'Frequently Asked Questions' },
    subheading: { type: String, default: 'Common sawalaat — sizing, shipping, returns aur zyada.' },
    items: {
      type: [{ question: String, answer: String, _id: false }],
      default: [
        { question: 'Sahi size kaisay chunun?', answer: 'Har product page par size guide mojood hai — apnay bust/waist/hip inches ke hisaab se choose karein. Confused hain? /fit-finder try karein ya WhatsApp par contact karein.' },
        { question: 'Shipping mein kitna time lagta hai?', answer: 'Karachi/Lahore/Islamabad: 2-3 din. Baaki Pakistan: 3-5 kaam ke din. Order confirm hone ke baad tracking number SMS/email par milta hai.' },
        { question: 'Cash on Delivery available hai?', answer: 'Jee haan — poore Pakistan mein COD available hai. Order place karte waqt "Cash on Delivery" select karein.' },
        { question: 'Shipping kitni hai? Free kab hoti hai?', answer: 'Flat rate PKR 350. PKR 4,999 se upar ke order par shipping bilkul FREE.' },
        { question: 'Discreet packaging hoti hai?', answer: 'Bilkul. Har order plain, unbranded packaging mein aata hai — bahar kuch nahi likha hota. Aap ki privacy hamari zimmedari hai.' },
        { question: 'Return / exchange kaisay karoon?', answer: '14 din ke andar unused / unworn product exchange kar sakte hain. Hygiene ki wajah se innerwear ki wapsi sirf defective items par hoti hai. Contact karein: /track ya WhatsApp.' },
        { question: 'Fabric quality kya hai?', answer: 'Har product 3-tier quality system se pass hota hai — cotton, modal, aur cooling mesh premium sources se. Fabric details har product page par listed hain.' },
        { question: 'Payment methods kya kya available hain?', answer: 'Abhi Cash on Delivery (COD) available hai. JazzCash, EasyPaisa, Bank Transfer aur online cards jaldi add ho rahay hain.' },
        { question: 'Order kaisay track karoon?', answer: 'Order confirm hone par aap ko unique order number milta hai (HS-YYYYMMDD-XXXXXX). /track page par jaa kar order number + phone se live status dekhein.' },
        { question: 'Kya aap international ship karte hain?', answer: 'Abhi sirf Pakistan ke andar deliver karte hain. Middle East aur international shipping jaldi shuru hogi.' },
      ],
    },
  },
  // ==========================================================================
  // Product-list sections on the home page — Shopify-style, fully admin-driven.
  // Each entry renders one <ProductListSection>. The admin can add, remove,
  // reorder and configure them from the Theme Editor without any code change.
  // ==========================================================================
  productSections: {
    type: [{
      _id: false,
      id:            { type: String, required: true },   // stable key, e.g. 'ps_1723...'
      enabled:       { type: Boolean, default: true },
      // --- Source -----------------------------------------------------------
      // featured | bestSeller | sale | newest | trending | category | manual
      source:        { type: String,  default: 'featured' },
      categorySlug:  { type: String,  default: '' },      // when source === 'category'
      gender:        { type: String,  default: '' },      // '' | women | men — extra filter
      productIds:    { type: [String], default: [] },     // when source === 'manual'
      sort:          { type: String,  default: 'newest' },// newest|popular|price-asc|price-desc
      // --- Header -----------------------------------------------------------
      eyebrow:       { type: String,  default: '' },
      heading:       { type: String,  default: 'Featured collection' },
      note:          { type: String,  default: '' },      // small right-aligned text
      showViewAll:   { type: Boolean, default: true },
      viewAllLabel:  { type: String,  default: 'View all' },
      viewAllHref:   { type: String,  default: '/shop' },
      headingAlign:  { type: String,  default: 'left' },  // left|center|right
      // --- Layout -----------------------------------------------------------
      layout:        { type: String,  default: 'grid' },  // grid | carousel
      carouselOnMobile: { type: Boolean, default: false },
      productCount:  { type: Number,  default: 8 },       // 2..24
      columns:       { type: Number,  default: 4 },       // 2..6 (desktop)
      mobileColumns: { type: Number,  default: 2 },       // 1..2
      gapX:          { type: Number,  default: 8 },       // px
      gapY:          { type: Number,  default: 24 },      // px
      width:         { type: String,  default: 'page' },  // page | full
      paddingTop:    { type: Number,  default: 48 },      // px
      paddingBottom: { type: Number,  default: 48 },      // px
      background:    { type: String,  default: '' },      // '' = transparent, else hex
      // --- Product card ------------------------------------------------------
      showPrice:     { type: Boolean, default: true },
      showSaleBadge: { type: Boolean, default: true },
      showQuickAdd:  { type: Boolean, default: true },
      showWishlist:  { type: Boolean, default: true },
      imageRatio:    { type: String,  default: 'portrait' }, // portrait|square|tall
    }],
    default: [],
  },
  // Operating costs — used by Dashboard P&L to calculate true profit
  operatingCosts: {
    packingPerOrder:  { type: Number, default: 0 },    // PKR per shipped order (packaging materials)
    shippingSubsidy:  { type: Number, default: 0 },    // avg PKR the store absorbs per order (courier vs charged)
    monthlyMarketing: { type: Number, default: 0 },    // PKR/month spent on ads (Meta, Google, TikTok)
    monthlySeo:       { type: Number, default: 0 },    // PKR/month spent on SEO / content
    monthlyOther:     { type: Number, default: 0 },    // PKR/month other fixed costs (hosting, tools)
    // --- Per-order economics (used by Finance → Order profitability) --------
    defaultCourierCost: { type: Number, default: 0 },  // PKR the courier bills you per parcel
    courierByCity: {                                   // overrides the default for named cities
      type: [{ _id: false, city: String, cost: Number }],
      default: [],
    },
    returnCourierMultiplier: { type: Number, default: 2 }, // a return bills both legs
    paymentFees: {                                     // % of order value kept by the gateway
      cod:       { type: Number, default: 0 },
      jazzcash:  { type: Number, default: 2 },
      easypaisa: { type: Number, default: 2 },
      bank:      { type: Number, default: 0 },
      card:      { type: Number, default: 2.75 },
    },
    // Monthly budgets — shown against actual spend on the Finance page
    budgets: {
      ads:   { type: Number, default: 0 },
      seo:   { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
  },
  /**
   * Live admin share link. `linkId` is embedded in every token the link mints,
   * so clearing it revokes them all at once. Only one link is active at a time.
   */
  adminShare: {
    linkId:    { type: String, default: '' },
    createdAt: { type: Date,   default: null },
    expiresAt: { type: Date,   default: null },
    label:     { type: String, default: '' },
  },
  /** Revenue target for the current month — drives the dashboard goal tracker. */
  monthlyRevenueGoal: { type: Number, default: 0 },
  /** Orders below this net margin are flagged amber on the profitability table. */
  marginThresholdPercent: { type: Number, default: 15 },
  // --- Marketing Automation settings ---
  automation: {
    abandonedCart: {
      enabled: { type: Boolean, default: false },
      delayHours: { type: Number, default: 2 }
    },
    reviewRequest: {
      enabled: { type: Boolean, default: false },
      delayDays: { type: Number, default: 7 }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
