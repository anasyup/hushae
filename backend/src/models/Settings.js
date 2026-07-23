const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'store', unique: true },
  storeName: { type: String, default: 'VÉLOURA' },
  tagline: { type: String, default: 'Second Skin, First Choice.' },
  contactEmail: { type: String, default: 'care@veloura.pk' },
  contactPhone: { type: String, default: '+92 300 0000000' },
  hero: {
    title: { type: String, default: 'Second Skin,\nFirst Choice.' },
    subtitle: { type: String, default: 'Underwear engineered in breathable, cloud-soft fabrics — designed in Pakistan, finished to an international standard.' },
    ctaWomen: { type: String, default: 'Shop Women' },
    ctaMen: { type: String, default: 'Shop Men' },
    image: { type: String, default: '' },
    video: { type: String, default: '' },            // optional MP4 for full-screen hero
    fullScreen: { type: Boolean, default: false },   // international-style full-viewport hero
    align: { type: String, default: 'left' },        // 'left' | 'center'
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
    title: { type: String, default: 'Join the VÉLOURA inner circle' },
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
    bankDetails: { type: String, default: 'Bank: Meezan Bank\nTitle: Veloura (Pvt) Ltd\nIBAN: PK00 MEZN 0000 0000 0000 0000' },
  },
  // Cookie consent popup shown to first-time visitors
  cookiePopup: {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: 'Cookies on VÉLOURA' },
    text: { type: String, default: 'We use cookies to keep you signed in and remember your bag. With your permission, we also use a few cookies to understand traffic and improve the store. Your data is never sold — promise.' },
  },
  theme: {
    accent: { type: String, default: '#0D0D0D' },
  },
  // Storefront password gate (like Shopify's password page) — empty password = lock can't be enabled
  storefrontLock: {
    enabled: { type: Boolean, default: false },
    password: { type: String, default: '' },
    heading: { type: String, default: 'VÉLOURA is opening soon' },
    message: { type: String, default: 'Hum jald launch kar rahay hain. Enter password to preview the store.' },
  },
  integrations: {
    whatsapp: {
      enabled: { type: Boolean, default: false },
      number: { type: String, default: '' },
      message: { type: String, default: 'Hi! I have a question about VÉLOURA.' },
    },
    social: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      tiktok: { type: String, default: '' },
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
