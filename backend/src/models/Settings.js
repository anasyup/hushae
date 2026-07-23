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
  theme: {
    accent: { type: String, default: '#0D0D0D' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
