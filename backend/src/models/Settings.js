const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'store', unique: true },
  storeName: { type: String, default: 'HUSHAE' },
  tagline: { type: String, default: 'Second Skin, First Choice.' },
  contactEmail: { type: String, default: 'care@hushae.pk' },
  contactPhone: { type: String, default: '+92 300 0000000' },
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
    textColor:      { type: String,  default: '#F7F5F1' },
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
        { question: 'Order kaisay track karoon?', answer: 'Order confirm hone par aap ko unique order number milta hai (VL-YYYYMMDD-XXXXXX). /track page par jaa kar order number + phone se live status dekhein.' },
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
  /** Revenue target for the current month — drives the dashboard goal tracker. */
  monthlyRevenueGoal: { type: Number, default: 0 },
  /** Orders below this net margin are flagged amber on the profitability table. */
  marginThresholdPercent: { type: Number, default: 15 },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
