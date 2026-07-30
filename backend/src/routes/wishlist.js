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
  /* The cap is enforced HERE, not just in the UI. A client that ignores the
     limit would otherwise grow this array without bound. $addToSet is a no-op
     for an item already saved, so re-saving never trips the cap. */
  let max = 50;
  try {
    const Settings = require('../models/Settings');
    const st = await Settings.findOne({ key: 'store' }).lean();
    const cfg = st?.customerExperience?.wishlist;
    if (cfg?.enabled === false) return res.status(403).json({ message: 'The wishlist is currently unavailable' });
    if (cfg?.maxItems) max = Number(cfg.maxItems);
  } catch { /* fall back to the default */ }

  const already = (req.user.wishlist || []).some((x) => String(x) === String(req.params.productId));
  if (!already && (req.user.wishlist || []).length >= max) {
    return res.status(400).json({ message: `Your wishlist is full (${max} items). Please remove something first.` });
  }

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
