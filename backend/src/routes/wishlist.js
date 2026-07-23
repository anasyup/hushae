const express = require('express');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect);

const populated = (user) =>
  user.populate({ path: 'wishlist', match: { isActive: true, status: { $ne: 'draft' } } });

router.get('/', asyncHandler(async (req, res) => {
  await populated(req.user);
  res.json({ products: req.user.wishlist });
}));

router.post('/:productId', asyncHandler(async (req, res) => {
  await req.user.updateOne({ $addToSet: { wishlist: req.params.productId } });
  const fresh = await require('../models/User').findById(req.user._id);
  await populated(fresh);
  res.json({ products: fresh.wishlist });
}));

router.delete('/:productId', asyncHandler(async (req, res) => {
  await req.user.updateOne({ $pull: { wishlist: req.params.productId } });
  const fresh = await require('../models/User').findById(req.user._id);
  await populated(fresh);
  res.json({ products: fresh.wishlist });
}));

module.exports = router;
