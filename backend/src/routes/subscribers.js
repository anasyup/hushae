const express = require('express');
const Subscriber = require('../models/Subscriber');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

// ---- Public: join the mailing list ----
router.post('/', asyncHandler(async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
  if (await Subscriber.findOne({ email })) return res.status(409).json({ message: 'already' });
  await Subscriber.create({ email });
  res.status(201).json({ ok: true });
}));

module.exports = router;
