const express = require('express');
const Subscriber = require('../models/Subscriber');
const { asyncHandler } = require('../utils/helpers');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// ---- Public: join the mailing list ----
/* MEASURED: eight consecutive POSTs from one IP all returned 201. Anyone
   could insert unlimited newsletter rows — database bloat, and a poisoned
   list the merchant would later pay to email. The existing duplicate check
   only stops the SAME address twice. */
const signupLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: 'subscribe', message: 'Too many signups from your connection — try again later' });

router.post('/', signupLimit, asyncHandler(async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
  if (await Subscriber.findOne({ email })) return res.status(409).json({ message: 'already' });
  await Subscriber.create({ email });
  res.status(201).json({ ok: true });
}));

module.exports = router;
