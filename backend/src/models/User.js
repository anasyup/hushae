const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  name: String,
  phone: String,
  address: String,
  city: String,
  province: String,
  postalCode: String,
  // Exactly one address may be the default. Enforced in the pre-save hook
  // below rather than trusted from the client, so a crafted request cannot
  // leave the account with two defaults or none.
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  addresses: [addressSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isActive: { type: Boolean, default: true },

  // ---- Profile ----
  // Stored as an /api/uploads/:id reference, same as every other image on the
  // site — never a base64 blob, which would bloat every /me response.
  avatar: { type: String, default: '' },

  // ---- Email verification ----
  // These exist so the feature is complete end to end, but nothing sends mail
  // until an SMTP/provider is connected AND settings.account.emailFeatures is
  // switched on. Existing accounts are treated as verified (see routes) so
  // turning verification on later cannot lock anyone out.
  emailVerified: { type: Boolean, default: false },
  verifyTokenHash: { type: String, default: '', select: false },
  verifyTokenExp: { type: Date, default: null, select: false },

  // ---- Password reset ----
  // Only the HASH of the token is stored. A database leak must not hand an
  // attacker working reset links.
  resetTokenHash: { type: String, default: '', select: false },
  resetTokenExp: { type: Date, default: null, select: false },

  // ---- Notification preferences ----
  notify: {
    orderEmail: { type: Boolean, default: true },
    orderSms: { type: Boolean, default: true },
    marketingEmail: { type: Boolean, default: false },
    marketingSms: { type: Boolean, default: false },
  },

  // Soft delete. A hard delete would orphan every order this customer placed,
  // and those orders are the merchant's financial records.
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

/* Exactly one default address, always. If the client marked several, the last
   one wins; if it marked none and addresses exist, the first becomes default. */
userSchema.pre('save', function (next) {
  if (this.isModified('addresses') && Array.isArray(this.addresses) && this.addresses.length) {
    const marked = this.addresses.filter((a) => a.isDefault);
    if (marked.length === 0) {
      this.addresses[0].isDefault = true;
    } else if (marked.length > 1) {
      const keep = marked[marked.length - 1];
      this.addresses.forEach((a) => { a.isDefault = a === keep; });
    }
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
