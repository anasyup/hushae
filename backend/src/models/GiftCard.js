const mongoose = require('mongoose');

/**
 * A gift card.
 *
 * The code is stored HASHED, like a password. A gift card is bearer money —
 * anyone holding the code can spend it — so a database leak must not hand an
 * attacker a wallet full of spendable cards. The last four characters are kept
 * in clear so the merchant can identify a card in a list, and the full code is
 * shown exactly once, at creation.
 *
 * Redemptions are appended rather than overwriting the balance, so a disputed
 * card can always be traced order by order.
 */
const giftCardSchema = new mongoose.Schema({
  codeHash:  { type: String, required: true, unique: true, index: true },
  last4:     { type: String, default: '' },
  // Human label so the merchant can find it: "Eid promo", "Refund for VL-123"
  label:     { type: String, default: '' },

  initialAmount: { type: Number, required: true, min: 1 },
  balance:       { type: Number, required: true, min: 0 },

  issuedTo:      { type: String, default: '' },   // email or phone, optional
  issuedToName:  { type: String, default: '' },
  issuedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  active:    { type: Boolean, default: true, index: true },
  expiresAt: { type: Date, default: null },

  redemptions: {
    type: [{
      _id: false,
      amount: Number,
      order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      orderNumber: String,
      at: { type: Date, default: Date.now },
    }],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('GiftCard', giftCardSchema);
